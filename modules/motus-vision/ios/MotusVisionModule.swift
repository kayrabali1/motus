import ExpoModulesCore
import AVFoundation
import Vision

public class MotusVisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MotusVision")

    Function("playSuccessSound") {
      MotusVisionView.playSuccessChime()
    }

    View(MotusVisionView.self) {
      Events("onRepDetected", "onBodyLocked", "onProgressChanged")
      
      Prop("exerciseType") { (view: MotusVisionView, type: String) in
        view.exerciseType = type
        view.resetTrackingState()
      }

      Prop("playSound") { (view: MotusVisionView, play: Bool) in
        view.playSound = play
      }

      Prop("targetReps") { (view: MotusVisionView, count: Int) in
        view.targetReps = count
        view.resetTrackingState()
      }

      Prop("strictMode") { (view: MotusVisionView, strict: Bool) in
        view.strictMode = strict
        view.resetTrackingState()
      }
    }
  }
}

class MotusVisionView: ExpoView, AVCaptureVideoDataOutputSampleBufferDelegate {
  let onRepDetected = EventDispatcher()
  let onBodyLocked = EventDispatcher()
  let onProgressChanged = EventDispatcher()
  
  var exerciseType: String = "pushups"
  var playSound: Bool = true
  var targetReps: Int = 0
  var strictMode: Bool = false
  
  private let captureSession = AVCaptureSession()
  private let videoOutput = AVCaptureVideoDataOutput()
  private var previewLayer: AVCaptureVideoPreviewLayer!
  private var overlayLayer = CAShapeLayer()
  
  private var isDown = false
  private var repCount = 0
  
  private var isBodyLocked = false
  private var lockStartTime: CFTimeInterval?
  private var lastAlignedTime: CFTimeInterval?
  
  // Calibration references
  private var maxVerticalDist: CGFloat = 0.0
  private var maxHipKneeDist: CGFloat = 0.0
  
  func resetTrackingState() {
    isDown = false
    repCount = 0
    isBodyLocked = false
    lockStartTime = nil
    lastAlignedTime = nil
    maxVerticalDist = 0.0
    maxHipKneeDist = 0.0
  }
  
  private func distance(p1: CGPoint, p2: CGPoint) -> CGFloat {
      return sqrt(pow(p1.x - p2.x, 2) + pow(p1.y - p2.y, 2))
  }
  
  // Audio players for reliable sound playback
  private static var normalPlayer: AVAudioPlayer?
  private static var successPlayer1: AVAudioPlayer?
  private static var successPlayer2: AVAudioPlayer?
  private static var successPlayer3: AVAudioPlayer?
  private static var audioSessionConfigured = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    MotusVisionView.configureAudioSession()
    setupCamera()
  }

  private static func configureAudioSession() {
    guard !audioSessionConfigured else { return }
    audioSessionConfigured = true
    do {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
      try session.setActive(true)
    } catch {
      print("Audio session config failed: \(error)")
    }
    
    // Pre-load system sound files for instant playback
    // Normal beep: Tock sound (short, crisp)
    if let url = URL(string: "/System/Library/Audio/UISounds/Tock.caf") {
      normalPlayer = try? AVAudioPlayer(contentsOf: url)
      normalPlayer?.prepareToPlay()
    }
    
    // Success chime: Use three rising tones
    // Tone 1 (low)
    if let url = URL(string: "/System/Library/Audio/UISounds/short_low_high.caf") {
      successPlayer1 = try? AVAudioPlayer(contentsOf: url)
      successPlayer1?.prepareToPlay()
    }
    // Fallback: try another reliable system sound
    if successPlayer1 == nil, let url = URL(string: "/System/Library/Audio/UISounds/New/Fanfare.caf") {
      successPlayer1 = try? AVAudioPlayer(contentsOf: url)
      successPlayer1?.prepareToPlay()
    }
  }

  /// Play a normal rep beep - short and crisp
  private func playNormalBeep() {
    guard playSound else { return }
    DispatchQueue.main.async {
      if let player = MotusVisionView.normalPlayer {
        player.currentTime = 0
        player.play()
      } else {
        // Guaranteed fallback
        AudioServicesPlaySystemSound(1104)
      }
    }
  }

  private func playLockdownChime() {
    guard playSound else { return }
    DispatchQueue.main.async {
      // 1111 is a camera focus lock sound
      AudioServicesPlaySystemSound(1111)
      
      let generator = UIImpactFeedbackGenerator(style: .medium)
      generator.prepare()
      generator.impactOccurred()
    }
  }

  /// Play a success chime - distinctly different from the normal beep
  static func playSuccessChime() {
    DispatchQueue.main.async {
      // Try the pre-loaded success sound first
      if let player = successPlayer1 {
        player.currentTime = 0
        player.play()
      } else {
        // Fallback: Play a rapid ascending triple-beep using guaranteed system sounds
        // 1057 = "key pressed" - very short, always works
        AudioServicesPlaySystemSound(1057)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) {
          AudioServicesPlaySystemSound(1057)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.24) {
          // 1025 = slightly different tone for the final note
          AudioServicesPlaySystemSound(1025)
        }
      }
      
      // Always add haptic feedback
      let generator = UINotificationFeedbackGenerator()
      generator.prepare()
      generator.notificationOccurred(.success)
    }
  }

  private func setupCamera() {
    captureSession.sessionPreset = .high
    
    guard let videoDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
          let videoInput = try? AVCaptureDeviceInput(device: videoDevice) else { return }
    
    if captureSession.canAddInput(videoInput) { captureSession.addInput(videoInput) }
    
    videoOutput.setSampleBufferDelegate(self, queue: DispatchQueue(label: "videoQueue"))
    if captureSession.canAddOutput(videoOutput) { captureSession.addOutput(videoOutput) }
    
    // Set video orientation to portrait for upright pose analysis
    if let connection = videoOutput.connection(with: .video) {
      if connection.isVideoOrientationSupported {
        connection.videoOrientation = .portrait
      }
      if connection.isVideoMirroringSupported {
        connection.isVideoMirrored = true
      }
    }
    
    previewLayer = AVCaptureVideoPreviewLayer(session: captureSession)
    previewLayer.videoGravity = .resizeAspectFill
    layer.addSublayer(previewLayer)
    
    overlayLayer.fillColor = UIColor(red: 0.22, green: 1.0, blue: 0.08, alpha: 0.8).cgColor
    overlayLayer.strokeColor = UIColor(red: 0.22, green: 1.0, blue: 0.08, alpha: 1.0).cgColor
    overlayLayer.lineWidth = 4
    overlayLayer.lineCap = .round
    layer.addSublayer(overlayLayer)
    
    DispatchQueue.global(qos: .background).async {
      self.captureSession.startRunning()
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer.frame = bounds
    overlayLayer.frame = bounds
    if let connection = previewLayer.connection {
      if connection.isVideoOrientationSupported {
        connection.videoOrientation = .portrait
      }
    }
  }

  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    if connection.isVideoOrientationSupported && connection.videoOrientation != .portrait {
      connection.videoOrientation = .portrait
    }
    if connection.isVideoMirroringSupported && !connection.isVideoMirrored {
      connection.isVideoMirrored = true
    }
    
    guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
    
    let request = VNDetectHumanBodyPoseRequest { [weak self] req, err in
      self?.processPoseObservation(req: req)
    }
    
    try? VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .up, options: [:]).perform([request])
  }
  
  private func onRepCompleted() {
    repCount += 1
    let isSuccess = repCount == targetReps
    
    if isSuccess {
      MotusVisionView.playSuccessChime()
    } else {
      playNormalBeep()
    }
    
    DispatchQueue.main.async {
      self.onRepDetected(["count": self.repCount, "isSuccess": isSuccess])
    }
  }

  private func processPoseObservation(req: VNRequest) {
    guard let observation = req.results?.first as? VNHumanBodyPoseObservation else {
        DispatchQueue.main.async { self.overlayLayer.path = nil }
        return
    }
    
    do {
      let recognizedPoints = try observation.recognizedPoints(.all)
      self.drawSkeleton(recognizedPoints)
      
      // 1. Determine if the body is aligned (visible with confidence > 0.5)
      var isAligned = false
      if exerciseType == "pushups" {
          let leftConfidence = (recognizedPoints[.leftShoulder]?.confidence ?? 0) > 0.5 &&
                               (recognizedPoints[.leftElbow]?.confidence ?? 0) > 0.5 &&
                               (recognizedPoints[.leftWrist]?.confidence ?? 0) > 0.5
          let rightConfidence = (recognizedPoints[.rightShoulder]?.confidence ?? 0) > 0.5 &&
                                (recognizedPoints[.rightElbow]?.confidence ?? 0) > 0.5 &&
                                (recognizedPoints[.rightWrist]?.confidence ?? 0) > 0.5
          isAligned = leftConfidence || rightConfidence
      } else if exerciseType == "squats" {
          let leftConfidence = (recognizedPoints[.leftHip]?.confidence ?? 0) > 0.5 &&
                               (recognizedPoints[.leftKnee]?.confidence ?? 0) > 0.5 &&
                               (recognizedPoints[.leftAnkle]?.confidence ?? 0) > 0.5
          let rightConfidence = (recognizedPoints[.rightHip]?.confidence ?? 0) > 0.5 &&
                                (recognizedPoints[.rightKnee]?.confidence ?? 0) > 0.5 &&
                                (recognizedPoints[.rightAnkle]?.confidence ?? 0) > 0.5
          isAligned = leftConfidence || rightConfidence
      } else if exerciseType == "high_knees" {
          isAligned = (recognizedPoints[.leftHip]?.confidence ?? 0) > 0.5 &&
                      (recognizedPoints[.rightHip]?.confidence ?? 0) > 0.5 &&
                      (recognizedPoints[.leftKnee]?.confidence ?? 0) > 0.5 &&
                      (recognizedPoints[.rightKnee]?.confidence ?? 0) > 0.5
      } else if exerciseType == "jumping_jacks" {
          isAligned = (recognizedPoints[.leftShoulder]?.confidence ?? 0) > 0.5 &&
                      (recognizedPoints[.rightShoulder]?.confidence ?? 0) > 0.5 &&
                      (recognizedPoints[.leftWrist]?.confidence ?? 0) > 0.5 &&
                      (recognizedPoints[.rightWrist]?.confidence ?? 0) > 0.5 &&
                      (recognizedPoints[.leftAnkle]?.confidence ?? 0) > 0.5 &&
                      (recognizedPoints[.rightAnkle]?.confidence ?? 0) > 0.5
      } else if exerciseType == "burpees" {
          isAligned = (recognizedPoints[.leftShoulder]?.confidence ?? 0) > 0.5 &&
                      (recognizedPoints[.leftAnkle]?.confidence ?? 0) > 0.5 &&
                      (recognizedPoints[.leftWrist]?.confidence ?? 0) > 0.5
      } else {
          isAligned = (recognizedPoints[.leftShoulder]?.confidence ?? 0) > 0.5 ||
                      (recognizedPoints[.rightShoulder]?.confidence ?? 0) > 0.5
      }

      // 2. Manage lockdown state & timers
      let now = CACurrentMediaTime()
      if isAligned {
          lastAlignedTime = now
          if lockStartTime == nil {
              lockStartTime = now
          } else if now - lockStartTime! >= 1.5 {
              if !isBodyLocked {
                  isBodyLocked = true
                  playLockdownChime()
                  DispatchQueue.main.async {
                      self.onBodyLocked(["locked": true])
                  }
              }
          }
      } else {
          lockStartTime = nil
          if isBodyLocked {
              // 2.0 second grace period to prevent minor hiccups from breaking flow
              if let lastAligned = lastAlignedTime, now - lastAligned > 2.0 {
                  isBodyLocked = false
                  DispatchQueue.main.async {
                      self.onBodyLocked(["locked": false])
                      self.onProgressChanged(["progress": 0.0])
                  }
              }
          }
      }

      // 3. Do not count reps if we are not locked down
      guard isBodyLocked else { return }

      // 4. Track reps based on the selected exercise
      if exerciseType == "pushups" {
          var headPoint: CGPoint? = nil
          if let neckJoint = recognizedPoints[.neck], neckJoint.confidence > 0.4 {
              headPoint = neckJoint.location
          } else if let lShoulder = recognizedPoints[.leftShoulder], let rShoulder = recognizedPoints[.rightShoulder],
                    lShoulder.confidence > 0.4 && rShoulder.confidence > 0.4 {
              headPoint = CGPoint(x: (lShoulder.location.x + rShoulder.location.x)/2.0, y: (lShoulder.location.y + rShoulder.location.y)/2.0)
          }
          
          guard let headLoc = headPoint,
                let lWrist = recognizedPoints[.leftWrist],
                let rWrist = recognizedPoints[.rightWrist] else { return }
                
          if lWrist.confidence > 0.4 && rWrist.confidence > 0.4 {
              let wristCenter = CGPoint(x: (lWrist.location.x + rWrist.location.x)/2.0, y: (lWrist.location.y + rWrist.location.y)/2.0)
              let wristDist = distance(p1: lWrist.location, p2: rWrist.location)
              
              guard wristDist > 0 else { return }
              
              let pushupDist = distance(p1: headLoc, p2: wristCenter)
              let pushupRatio = pushupDist / wristDist
              
              // Calibrate plank/straight arm height (max pushupRatio seen during tracking/lock)
              self.maxVerticalDist = max(self.maxVerticalDist, pushupRatio)
              
              if self.maxVerticalDist > 0 {
                  let relativeRatio = pushupRatio / self.maxVerticalDist
                  
                  // Progress: from plank (1.0 relativeRatio) down to chest-to-floor (0.70 relativeRatio)
                  let progress = max(0.0, min(1.0, (1.0 - relativeRatio) / 0.30))
                  DispatchQueue.main.async {
                      self.onProgressChanged(["progress": progress])
                  }
                  
                  // Down: relativeRatio < 0.70 (30% drop in head-to-wrist distance)
                  // Up: relativeRatio > 0.88 (return to 88% height)
                  if relativeRatio < 0.70 && !isDown {
                      isDown = true
                  } else if relativeRatio > 0.88 && isDown {
                      isDown = false
                      onRepCompleted()
                  }
              }
          }
      } else if exerciseType == "squats" {
          // Front-facing squats using vertical hip-to-ankle projection along the torso axis
          guard let lShoulder = recognizedPoints[.leftShoulder],
                let rShoulder = recognizedPoints[.rightShoulder],
                let lHip = recognizedPoints[.leftHip],
                let rHip = recognizedPoints[.rightHip],
                let lAnkle = recognizedPoints[.leftAnkle],
                let rAnkle = recognizedPoints[.rightAnkle] else { return }
                
          if lShoulder.confidence > 0.4 && rShoulder.confidence > 0.4 &&
             lHip.confidence > 0.4 && rHip.confidence > 0.4 &&
             lAnkle.confidence > 0.4 && rAnkle.confidence > 0.4 {
              
              // Torso vector from hip center to shoulder center
              let shCenter = CGPoint(x: (lShoulder.location.x + rShoulder.location.x)/2.0, y: (lShoulder.location.y + rShoulder.location.y)/2.0)
              let hipCenter = CGPoint(x: (lHip.location.x + rHip.location.x)/2.0, y: (lHip.location.y + rHip.location.y)/2.0)
              let torsoVec = CGPoint(x: shCenter.x - hipCenter.x, y: shCenter.y - hipCenter.y)
              let torsoLen = sqrt(torsoVec.x * torsoVec.x + torsoVec.y * torsoVec.y)
              
              guard torsoLen > 0 else { return }
              
              // Project both left and right hip-to-ankle vectors onto the torso vector
              let lLegVec = CGPoint(x: lHip.location.x - lAnkle.location.x, y: lHip.location.y - lAnkle.location.y)
              let rLegVec = CGPoint(x: rHip.location.x - rAnkle.location.x, y: rHip.location.y - rAnkle.location.y)
              
              let lProj = (lLegVec.x * torsoVec.x + lLegVec.y * torsoVec.y) / torsoLen
              let rProj = (rLegVec.x * torsoVec.x + rLegVec.y * torsoVec.y) / torsoLen
              let avgProj = (lProj + rProj) / 2.0
              
              let squatRatio = avgProj / torsoLen
              
              // Calibrate standing height reference (max squatRatio seen during standing lock)
              self.maxVerticalDist = max(self.maxVerticalDist, squatRatio)
              
              if self.maxVerticalDist > 0 {
                  let relativeRatio = squatRatio / self.maxVerticalDist
                  
                  // Progress: from standing (1.0 relativeRatio) down to target (0.75 relativeRatio)
                  let progress = max(0.0, min(1.0, (1.0 - relativeRatio) / 0.25))
                  DispatchQueue.main.async {
                      self.onProgressChanged(["progress": progress])
                  }
                  
                  // Down: relativeRatio < 0.75 (25% height drop along torso axis)
                  // Up: relativeRatio > 0.90 (return to 90% standing height)
                  if relativeRatio < 0.75 && !isDown {
                      isDown = true
                  } else if relativeRatio > 0.90 && isDown {
                      isDown = false
                      onRepCompleted()
                  }
              }
          }
      } else if exerciseType == "pullups" {
          // Side-agnostic simple ratio/angle heuristic
          let lSh = recognizedPoints[.leftShoulder]?.confidence ?? 0
          let lEl = recognizedPoints[.leftElbow]?.confidence ?? 0
          let lWr = recognizedPoints[.leftWrist]?.confidence ?? 0
          let lHp = recognizedPoints[.leftHip]?.confidence ?? 0
          let leftConfidence = lSh + lEl + lWr + lHp
          
          let rSh = recognizedPoints[.rightShoulder]?.confidence ?? 0
          let rEl = recognizedPoints[.rightElbow]?.confidence ?? 0
          let rWr = recognizedPoints[.rightWrist]?.confidence ?? 0
          let rHp = recognizedPoints[.rightHip]?.confidence ?? 0
          let rightConfidence = rSh + rEl + rWr + rHp
          
          let isLeft = leftConfidence > rightConfidence
          
          guard let shoulder = recognizedPoints[isLeft ? .leftShoulder : .rightShoulder],
                let elbow = recognizedPoints[isLeft ? .leftElbow : .rightElbow],
                let wrist = recognizedPoints[isLeft ? .leftWrist : .rightWrist],
                let hip = recognizedPoints[isLeft ? .leftHip : .rightHip] else { return }
                
          if shoulder.confidence > 0.5 && elbow.confidence > 0.5 && wrist.confidence > 0.5 && hip.confidence > 0.5 {
            if wrist.location.y > shoulder.location.y {
                let angle = calculateAngle(p1: shoulder.location, p2: elbow.location, p3: wrist.location)
                
                // Compare arm extension to torso length to prevent simple arm-flapping cheats
                let torsoLength: CGFloat = shoulder.location.y - hip.location.y
                let armExtension: CGFloat = wrist.location.y - shoulder.location.y
                let ratio: CGFloat = torsoLength > 0 ? armExtension / torsoLength : 1.0
                
                // Target is ratio < 0.45, starting from straight hang ratio 0.65.
                let progress = max(0.0, min(1.0, (0.65 - ratio) / 0.20))
                DispatchQueue.main.async {
                    self.onProgressChanged(["progress": progress])
                }
                
                // Pulled up: arms are bent tightly (angle < 80) AND hands are close to shoulders (ratio < 0.45)
                if angle < 80 && ratio < 0.45 && !isDown {
                    isDown = true
                } 
                // Hanging: arms are straight (angle > 135) AND hands are far above shoulders (ratio > 0.65)
                else if angle > 135 && ratio > 0.65 && isDown {
                    isDown = false
                    onRepCompleted()
                }
            }
          }
      } else if exerciseType == "jumping_jacks" {
          guard let lShoulder = recognizedPoints[.leftShoulder], let rShoulder = recognizedPoints[.rightShoulder],
                let lWrist = recognizedPoints[.leftWrist], let rWrist = recognizedPoints[.rightWrist],
                let lAnkle = recognizedPoints[.leftAnkle], let rAnkle = recognizedPoints[.rightAnkle] else { return }
                
          if lShoulder.confidence > 0.5 && rShoulder.confidence > 0.5 && lWrist.confidence > 0.5 && rWrist.confidence > 0.5 && lAnkle.confidence > 0.5 && rAnkle.confidence > 0.5 {
              let shoulderDist = distance(p1: lShoulder.location, p2: rShoulder.location)
              let ankleDist = distance(p1: lAnkle.location, p2: rAnkle.location)
              
              let armsUp = lWrist.location.y > lShoulder.location.y && rWrist.location.y > rShoulder.location.y
              let legsApart = ankleDist > (shoulderDist * 1.5)
              let legsTogether = ankleDist < (shoulderDist * 1.2)
              
              if armsUp && legsApart && !isDown {
                  isDown = true
              } else if !armsUp && legsTogether && isDown {
                  isDown = false
                  onRepCompleted()
              }
          }
      } else if exerciseType == "burpees" {
          guard let shoulder = recognizedPoints[.leftShoulder], let ankle = recognizedPoints[.leftAnkle], let wrist = recognizedPoints[.leftWrist] else { return }
          
          if shoulder.confidence > 0.5 && ankle.confidence > 0.5 && wrist.confidence > 0.5 {
              let verticalDiff = abs(shoulder.location.y - ankle.location.y)
              let horizontalDiff = abs(shoulder.location.x - ankle.location.x)
              
              let isHorizontal = verticalDiff < horizontalDiff
              let isVertical = verticalDiff > horizontalDiff
              let armsUp = wrist.location.y > shoulder.location.y
              
              if isHorizontal && !isDown {
                  isDown = true
              } else if isVertical && armsUp && isDown {
                  isDown = false
                  onRepCompleted()
              }
          }
      } else if exerciseType == "high_knees" {
          // Front-facing high knees ratio tracking projected along the torso axis
          guard let lShoulder = recognizedPoints[.leftShoulder],
                let rShoulder = recognizedPoints[.rightShoulder],
                let lHip = recognizedPoints[.leftHip],
                let rHip = recognizedPoints[.rightHip],
                let lKnee = recognizedPoints[.leftKnee],
                let rKnee = recognizedPoints[.rightKnee] else { return }
                
          if lShoulder.confidence > 0.4 && rShoulder.confidence > 0.4 &&
             lHip.confidence > 0.4 && rHip.confidence > 0.4 &&
             lKnee.confidence > 0.4 && rKnee.confidence > 0.4 {
              
              // Torso vector from hip center to shoulder center
              let shCenter = CGPoint(x: (lShoulder.location.x + rShoulder.location.x)/2.0, y: (lShoulder.location.y + rShoulder.location.y)/2.0)
              let hipCenter = CGPoint(x: (lHip.location.x + rHip.location.x)/2.0, y: (lHip.location.y + rHip.location.y)/2.0)
              let torsoVec = CGPoint(x: shCenter.x - hipCenter.x, y: shCenter.y - hipCenter.y)
              let torsoLen = sqrt(torsoVec.x * torsoVec.x + torsoVec.y * torsoVec.y)
              
              guard torsoLen > 0 else { return }
              
              // Project knee-to-hip vectors onto the torso vector
              let lKneeVec = CGPoint(x: lHip.location.x - lKnee.location.x, y: lHip.location.y - lKnee.location.y)
              let rKneeVec = CGPoint(x: rHip.location.x - rKnee.location.x, y: rHip.location.y - rKnee.location.y)
              
              let lProj = (lKneeVec.x * torsoVec.x + lKneeVec.y * torsoVec.y) / torsoLen
              let rProj = (rKneeVec.x * torsoVec.x + rKneeVec.y * torsoVec.y) / torsoLen
              
              // Calibrate standing thigh length ratio
              self.maxHipKneeDist = max(self.maxHipKneeDist, max(lProj, rProj))
              
              if self.maxHipKneeDist > 0 {
                  let lRatio = lProj / self.maxHipKneeDist
                  let rRatio = rProj / self.maxHipKneeDist
                  
                  // Knee Up (active): ratio < 0.25 (knee raised 75% of standing distance along torso axis)
                  let lKneeUp = lRatio < 0.25
                  let rKneeUp = rRatio < 0.25
                  
                  // Knee Down (inactive): return past 75% height
                  let lKneeDown = lRatio > 0.75
                  let rKneeDown = rRatio > 0.75
                  
                  // Progress represents the height of whichever knee is lifted higher
                  let progress = max(0.0, min(1.0, (1.0 - min(lRatio, rRatio)) / 0.75))
                  DispatchQueue.main.async {
                      self.onProgressChanged(["progress": progress])
                  }
                  
                  if (lKneeUp || rKneeUp) && !isDown {
                      isDown = true
                  } else if (lKneeDown && rKneeDown) && isDown {
                      isDown = false
                      onRepCompleted()
                  }
              }
          }
      }
      
    } catch {
      print("Pose processing failed")
    }
  }

  private func calculateAngle(p1: CGPoint, p2: CGPoint, p3: CGPoint) -> CGFloat {
      let v1 = CGVector(dx: p1.x - p2.x, dy: p1.y - p2.y)
      let v2 = CGVector(dx: p3.x - p2.x, dy: p3.y - p2.y)
      let angle = atan2(v2.dy, v2.dx) - atan2(v1.dy, v1.dx)
      var deg = angle * 180 / .pi
      if deg < 0 { deg += 360 }
      if deg > 180 { deg = 360 - deg }
      return deg
  }

  private func drawSkeleton(_ recognizedPoints: [VNHumanBodyPoseObservation.JointName : VNRecognizedPoint]) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      
      // Update color based on lockdown status (Yellow when searching, Green when locked)
      if self.isBodyLocked {
          self.overlayLayer.fillColor = UIColor(red: 0.22, green: 1.0, blue: 0.08, alpha: 0.8).cgColor
          self.overlayLayer.strokeColor = UIColor(red: 0.22, green: 1.0, blue: 0.08, alpha: 1.0).cgColor
      } else {
          // Dynamic warm yellow color
          self.overlayLayer.fillColor = UIColor(red: 1.0, green: 0.80, blue: 0.0, alpha: 0.8).cgColor
          self.overlayLayer.strokeColor = UIColor(red: 1.0, green: 0.80, blue: 0.0, alpha: 1.0).cgColor
      }
      
      let path = UIBezierPath()
      let jointsToDraw: [VNHumanBodyPoseObservation.JointName] = [
          .leftShoulder, .rightShoulder, .leftElbow, .rightElbow, .leftWrist, .rightWrist,
          .leftHip, .rightHip, .leftKnee, .rightKnee, .leftAnkle, .rightAnkle, .neck, .root
      ]
      
      let connections: [(VNHumanBodyPoseObservation.JointName, VNHumanBodyPoseObservation.JointName)] = [
          (.leftShoulder, .rightShoulder), (.leftShoulder, .leftElbow), (.leftElbow, .leftWrist),
          (.rightShoulder, .rightElbow), (.rightElbow, .rightWrist),
          (.leftShoulder, .leftHip), (.rightShoulder, .rightHip), (.leftHip, .rightHip),
          (.leftHip, .leftKnee), (.leftKnee, .leftAnkle),
          (.rightHip, .rightKnee), (.rightKnee, .rightAnkle)
      ]
      
      for connection in connections {
          guard let p1 = recognizedPoints[connection.0], let p2 = recognizedPoints[connection.1],
                p1.confidence > 0.3, p2.confidence > 0.3 else { continue }
          
          let pt1 = self.convert(point: p1.location)
          let pt2 = self.convert(point: p2.location)
          
          path.move(to: pt1)
          path.addLine(to: pt2)
      }
      
      for joint in jointsToDraw {
          guard let point = recognizedPoints[joint], point.confidence > 0.3 else { continue }
          let pt = self.convert(point: point.location)
          path.move(to: pt)
          path.addArc(withCenter: pt, radius: 8, startAngle: 0, endAngle: 2 * .pi, clockwise: true)
      }
      
      self.overlayLayer.path = path.cgPath
    }
  }

  private func convert(point: CGPoint) -> CGPoint {
      // Direct scaling of portrait normalized coordinates to bounds layout.
      // Since front camera frames are already portrait and mirrored, we map X directly.
      let x = point.x * bounds.width
      let y = (1.0 - point.y) * bounds.height
      return CGPoint(x: x, y: y)
  }
}

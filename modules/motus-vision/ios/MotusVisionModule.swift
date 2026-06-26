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
      Events("onRepDetected")
      
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
  
  func resetTrackingState() {
    isDown = false
    repCount = 0
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
  }

  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
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
      
      if exerciseType == "pushups" {
          let leftConfidence = (recognizedPoints[.leftShoulder]?.confidence ?? 0) + (recognizedPoints[.leftElbow]?.confidence ?? 0) + (recognizedPoints[.leftWrist]?.confidence ?? 0)
          let rightConfidence = (recognizedPoints[.rightShoulder]?.confidence ?? 0) + (recognizedPoints[.rightElbow]?.confidence ?? 0) + (recognizedPoints[.rightWrist]?.confidence ?? 0)
          
          let isLeft = leftConfidence > rightConfidence
          
          guard let shoulder = recognizedPoints[isLeft ? .leftShoulder : .rightShoulder],
                let elbow = recognizedPoints[isLeft ? .leftElbow : .rightElbow],
                let wrist = recognizedPoints[isLeft ? .leftWrist : .rightWrist] else { return }
                
          if shoulder.confidence > 0.5 && elbow.confidence > 0.5 && wrist.confidence > 0.5 {
            let armAngle = calculateAngle(p1: shoulder.location, p2: elbow.location, p3: wrist.location)
            
            // Calculate scale-invariant shoulder-to-wrist extension ratio if both shoulders are visible
            var extensionRatio: CGFloat = 1.0
            if let lShoulder = recognizedPoints[.leftShoulder],
               let rShoulder = recognizedPoints[.rightShoulder],
               lShoulder.confidence > 0.5 && rShoulder.confidence > 0.5 {
                let shoulderDistance = distance(p1: lShoulder.location, p2: rShoulder.location)
                if shoulderDistance > 0 {
                    let shoulderWristDist = distance(p1: shoulder.location, p2: wrist.location)
                    extensionRatio = shoulderWristDist / shoulderDistance
                }
            }
            
            // Down: Either elbow is bent (< 100) OR chest is low (shoulder close to wrist, ratio < 0.65)
            let isDownSignal = (armAngle < 100) || (extensionRatio < 0.65)
            
            // Up: Either elbow is extended (> 145) OR chest is high (shoulder far from wrist, ratio > 1.1)
            let isUpSignal = (armAngle > 145) || (extensionRatio > 1.1)
            
            if isDownSignal && !isDown {
                isDown = true
            } else if isUpSignal && isDown {
                isDown = false
                onRepCompleted()
            }
          }
      } else if exerciseType == "squats" {
          guard let leftHip = recognizedPoints[.leftHip],
                let leftKnee = recognizedPoints[.leftKnee],
                let leftAnkle = recognizedPoints[.leftAnkle] else { return }
                
          if leftHip.confidence > 0.5 && leftKnee.confidence > 0.5 && leftAnkle.confidence > 0.5 {
            let angle = calculateAngle(p1: leftHip.location, p2: leftKnee.location, p3: leftAnkle.location)
            if angle < 100 && !isDown {
                isDown = true
            } else if angle > 150 && isDown {
                isDown = false
                onRepCompleted()
            }
          }
      } else if exerciseType == "pullups" {
          guard let leftShoulder = recognizedPoints[.leftShoulder],
                let leftElbow = recognizedPoints[.leftElbow],
                let leftWrist = recognizedPoints[.leftWrist],
                let leftHip = recognizedPoints[.leftHip] else { return }
                
          if leftShoulder.confidence > 0.5 && leftElbow.confidence > 0.5 && leftWrist.confidence > 0.5 && leftHip.confidence > 0.5 {
            
            // In Vision, Y=0 is bottom, Y=1 is top. Wrist must be above shoulder.
            if leftWrist.location.y > leftShoulder.location.y {
                let angle = calculateAngle(p1: leftShoulder.location, p2: leftElbow.location, p3: leftWrist.location)
                
                // Compare arm extension to torso length to prevent simple arm-flapping cheats
                let torsoLength = leftShoulder.location.y - leftHip.location.y
                let armExtension = leftWrist.location.y - leftShoulder.location.y
                let ratio = torsoLength > 0 ? armExtension / torsoLength : 1.0
                
                // Pulled up: arms are bent tightly (angle < 75) AND hands are close to shoulders (ratio < 0.4)
                if angle < 75 && ratio < 0.4 && !isDown {
                    isDown = true // Pulled up
                } 
                // Hanging: arms are straight (angle > 140) AND hands are far above shoulders (ratio > 0.7)
                else if angle > 140 && ratio > 0.7 && isDown {
                    isDown = false // Hanging down
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
          guard let lHip = recognizedPoints[.leftHip], let rHip = recognizedPoints[.rightHip],
                let lKnee = recognizedPoints[.leftKnee], let rKnee = recognizedPoints[.rightKnee] else { return }
                
          if lHip.confidence > 0.5 && rHip.confidence > 0.5 && lKnee.confidence > 0.5 && rKnee.confidence > 0.5 {
              let lKneeUp = lKnee.location.y > lHip.location.y
              let rKneeUp = rKnee.location.y > rHip.location.y
              
              if (lKneeUp || rKneeUp) && !isDown {
                  isDown = true
              } else if !lKneeUp && !rKneeUp && isDown {
                  isDown = false
                  onRepCompleted()
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
      let convertedPoint = CGPoint(x: point.x, y: 1.0 - point.y)
      return previewLayer.layerPointConverted(fromCaptureDevicePoint: convertedPoint)
  }
}

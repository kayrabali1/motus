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
  
  // EMA Filter states for joint angles / ratios
  private var smoothedJointAngle1: CGFloat = 180.0
  private var smoothedJointAngle2: CGFloat = 0.0
  private var hasInitializedAngles = false
  
  // Cooldown timer
  private var lastRepTime: Double = 0
  
  func resetTrackingState() {
    isDown = false
    repCount = 0
    smoothedJointAngle1 = 180.0
    smoothedJointAngle2 = 0.0
    hasInitializedAngles = false
    lastRepTime = 0
  }
  
  private func smooth(_ current: CGFloat, smoothed: inout CGFloat) {
    if !hasInitializedAngles {
      smoothed = current
    } else {
      smoothed = 0.3 * current + 0.7 * smoothed
    }
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
    let currentTime = ProcessInfo.processInfo.systemUptime
    guard currentTime - lastRepTime >= 1.0 else { return }
    lastRepTime = currentTime
    
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
                let wrist = recognizedPoints[isLeft ? .leftWrist : .rightWrist],
                let hip = recognizedPoints[isLeft ? .leftHip : .rightHip],
                let ankle = recognizedPoints[isLeft ? .leftAnkle : .rightAnkle] else { return }
                
          if shoulder.confidence > 0.5 && elbow.confidence > 0.5 && wrist.confidence > 0.5 && hip.confidence > 0.5 && ankle.confidence > 0.5 {
              let bodyAngle = calculateAngle(p1: shoulder.location, p2: hip.location, p3: ankle.location)
              let armAngle = calculateAngle(p1: shoulder.location, p2: elbow.location, p3: wrist.location)
              
              smooth(armAngle, smoothed: &smoothedJointAngle1)
              smooth(bodyAngle, smoothed: &smoothedJointAngle2)
              hasInitializedAngles = true
              
              // Verify form: Body angle must be relatively straight (plank)
              let requiredBodyAngle: CGFloat = strictMode ? 155 : 130
              let requiredDownArmAngle: CGFloat = strictMode ? 75 : 90
              let requiredUpArmAngle: CGFloat = strictMode ? 165 : 150

              if smoothedJointAngle2 > requiredBodyAngle {
                  if smoothedJointAngle1 < requiredDownArmAngle && !isDown {
                      isDown = true
                  } else if smoothedJointAngle1 > requiredUpArmAngle && isDown {
                      isDown = false
                      onRepCompleted()
                  }
              }
          }
      } else if exerciseType == "squats" {
          let leftConfidence = (recognizedPoints[.leftHip]?.confidence ?? 0) + (recognizedPoints[.leftKnee]?.confidence ?? 0) + (recognizedPoints[.leftAnkle]?.confidence ?? 0)
          let rightConfidence = (recognizedPoints[.rightHip]?.confidence ?? 0) + (recognizedPoints[.rightKnee]?.confidence ?? 0) + (recognizedPoints[.rightAnkle]?.confidence ?? 0)
          
          let isLeft = leftConfidence > rightConfidence
          
          guard let hip = recognizedPoints[isLeft ? .leftHip : .rightHip],
                let knee = recognizedPoints[isLeft ? .leftKnee : .rightKnee],
                let ankle = recognizedPoints[isLeft ? .leftAnkle : .rightAnkle] else { return }
                
          if hip.confidence > 0.5 && knee.confidence > 0.5 && ankle.confidence > 0.5 {
              let kneeAngle = calculateAngle(p1: hip.location, p2: knee.location, p3: ankle.location)
              
              // Scale-invariant parallel depth ratio
              let thighLength = distance(p1: hip.location, p2: knee.location)
              let parallelRatio = thighLength > 0 ? (hip.location.y - knee.location.y) / thighLength : 1.0
              
              smooth(kneeAngle, smoothed: &smoothedJointAngle1)
              smooth(parallelRatio, smoothed: &smoothedJointAngle2)
              hasInitializedAngles = true
              
              // Down & Up checks with optional strict form requirements
              let requiredDownKneeAngle: CGFloat = strictMode ? 85 : 100
              let requiredDownRatio: CGFloat = strictMode ? 0.0 : 0.2
              let requiredUpKneeAngle: CGFloat = strictMode ? 170 : 150
              let requiredUpRatio: CGFloat = strictMode ? 0.8 : 0.6

              if smoothedJointAngle1 < requiredDownKneeAngle && smoothedJointAngle2 < requiredDownRatio && !isDown {
                  isDown = true
              } 
              else if smoothedJointAngle1 > requiredUpKneeAngle && smoothedJointAngle2 > requiredUpRatio && isDown {
                  isDown = false
                  onRepCompleted()
              }
          }
      } else if exerciseType == "pullups" {
          let leftConfidence = (recognizedPoints[.leftShoulder]?.confidence ?? 0) + (recognizedPoints[.leftElbow]?.confidence ?? 0) + (recognizedPoints[.leftWrist]?.confidence ?? 0)
          let rightConfidence = (recognizedPoints[.rightShoulder]?.confidence ?? 0) + (recognizedPoints[.rightElbow]?.confidence ?? 0) + (recognizedPoints[.rightWrist]?.confidence ?? 0)
          
          let isLeft = leftConfidence > rightConfidence
          
          guard let shoulder = recognizedPoints[isLeft ? .leftShoulder : .rightShoulder],
                let elbow = recognizedPoints[isLeft ? .leftElbow : .rightElbow],
                let wrist = recognizedPoints[isLeft ? .leftWrist : .rightWrist] else { return }
                
          if shoulder.confidence > 0.5 && elbow.confidence > 0.5 && wrist.confidence > 0.5 {
              // Ensure wrist is above shoulder
              if wrist.location.y > shoulder.location.y {
                  let armAngle = calculateAngle(p1: shoulder.location, p2: elbow.location, p3: wrist.location)
                  
                  // Scale-invariant forearm ratio (hip-less tracking)
                  let forearmLength = distance(p1: elbow.location, p2: wrist.location)
                  let shoulderWristDistance = distance(p1: shoulder.location, p2: wrist.location)
                  let pullupRatio = forearmLength > 0 ? shoulderWristDistance / forearmLength : 1.0
                  
                  smooth(armAngle, smoothed: &smoothedJointAngle1)
                  smooth(pullupRatio, smoothed: &smoothedJointAngle2)
                  hasInitializedAngles = true
                  
                  // Pulled up & hanging checks with optional strict form requirements
                  let requiredUpArmAngle: CGFloat = strictMode ? 65 : 80
                  let requiredUpRatio: CGFloat = strictMode ? 0.7 : 0.9
                  let requiredDownArmAngle: CGFloat = strictMode ? 165 : 140
                  let requiredDownRatio: CGFloat = strictMode ? 1.6 : 1.4

                  if smoothedJointAngle1 < requiredUpArmAngle && smoothedJointAngle2 < requiredUpRatio && !isDown {
                      isDown = true
                  } 
                  else if smoothedJointAngle1 > requiredDownArmAngle && smoothedJointAngle2 > requiredDownRatio && isDown {
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

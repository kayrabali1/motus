import ExpoModulesCore
import AVFoundation
import Vision

public class MotusVisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MotusVision")

    Function("playSuccessSound") {
      AudioServicesPlaySystemSound(1025) // Reassuring "Ding"
    }

    View(MotusVisionView.self) {
      Events("onRepDetected")
      
      Prop("exerciseType") { (view: MotusVisionView, type: String) in
        view.exerciseType = type
      }

      Prop("playSound") { (view: MotusVisionView, play: Bool) in
        view.playSound = play
      }

      Prop("targetReps") { (view: MotusVisionView, count: Int) in
        view.targetReps = count
      }
    }
  }
}

class MotusVisionView: ExpoView, AVCaptureVideoDataOutputSampleBufferDelegate {
  let onRepDetected = EventDispatcher()
  var exerciseType: String = "pushups"
  var playSound: Bool = true
  var targetReps: Int = 0
  
  private let captureSession = AVCaptureSession()
  private let videoOutput = AVCaptureVideoDataOutput()
  private var previewLayer: AVCaptureVideoPreviewLayer!
  private var overlayLayer = CAShapeLayer()
  
  private var isDown = false
  private var repCount = 0

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setupCamera()
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
    
    overlayLayer.fillColor = UIColor(red: 0.22, green: 1.0, blue: 0.08, alpha: 0.8).cgColor // #39FF14 equivalent
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
            
            // Check for straight back/plank position (body angle roughly straight)
            if bodyAngle > 130 {
                if armAngle < 90 && !isDown {
                    isDown = true
                } else if armAngle > 150 && isDown {
                    isDown = false
                    repCount += 1
                    if self.playSound {
                        if self.repCount == self.targetReps {
                            AudioServicesPlaySystemSound(1025)
                        } else {
                            AudioServicesPlaySystemSound(1322)
                        }
                    }
                    DispatchQueue.main.async { self.onRepDetected(["count": self.repCount]) }
                }
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
                repCount += 1
                if self.playSound {
                    if self.repCount == self.targetReps {
                        AudioServicesPlaySystemSound(1025)
                    } else {
                        AudioServicesPlaySystemSound(1322)
                    }
                }
                DispatchQueue.main.async { self.onRepDetected(["count": self.repCount]) }
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
                    repCount += 1
                    if self.playSound {
                        if self.repCount == self.targetReps {
                            AudioServicesPlaySystemSound(1025)
                        } else {
                            AudioServicesPlaySystemSound(1322)
                        }
                    }
                    DispatchQueue.main.async { self.onRepDetected(["count": self.repCount]) }
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

import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "../styles/Lobby.module.css";

// 🎯 MUI ICONS
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";

export default function Lobby() {
  const { id } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [loading, setLoading] = useState(false);

  const name = sessionStorage.getItem("userName");

  // 🎥 START CAMERA PREVIEW
  const startPreview = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = media;
      setStream(media);

      if (videoRef.current) {
        videoRef.current.srcObject = media;
      }
    } catch (err) {
      console.log("Camera error:", err);
    }
  };

  // 🧹 CLEANUP CAMERA ON LEAVE
  useEffect(() => {
    startPreview();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 🎤 TOGGLE MIC
  const toggleMic = () => {
    if (!streamRef.current) return;

    const audioTrack = streamRef.current.getAudioTracks()[0];
    audioTrack.enabled = !micOn;
    setMicOn(!micOn);
  };

  // 📷 TOGGLE CAMERA
  const toggleCam = () => {
    if (!streamRef.current) return;

    const videoTrack = streamRef.current.getVideoTracks()[0];
    videoTrack.enabled = !camOn;
    setCamOn(!camOn);
  };

  // 🚀 JOIN MEETING (ZOOM STYLE LOADING)
  const joinMeeting = () => {
    setLoading(true);

    // Save toggling state to sessionStorage
    sessionStorage.setItem("zoom-meeting-initial-micOn", JSON.stringify(micOn));
    sessionStorage.setItem("zoom-meeting-initial-camOn", JSON.stringify(camOn));

    setTimeout(() => {
      navigate(`/meeting/${id}`, {
        state: {
          micOn,
          camOn,
        },
      });
    }, 2000);
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <h2 className={styles.title}>Preparing your meeting...</h2>

      {/* VIDEO BOX */}
      <div className={styles.videoBox}>
        <video ref={videoRef} autoPlay muted className={styles.video} />

        {/* CAMERA OFF TEXT */}
        {!camOn && <div className={styles.camOff}>Camera is Off</div>}

        {/* CONTROLS */}
        <div className={styles.controls}>
          {/* MIC BUTTON */}
          <button onClick={toggleMic} className={styles.btn}>
            {micOn ? <MicIcon /> : <MicOffIcon />}
          </button>

          {/* CAMERA BUTTON */}
          <button onClick={toggleCam} className={styles.btn}>
            {camOn ? <VideocamIcon /> : <VideocamOffIcon />}
          </button>
        </div>
      </div>

      {/* USER NAME */}
      <h3 className={styles.name}>👤 {name}</h3>

      {/* JOIN BUTTON */}
      <button
        onClick={joinMeeting}
        className={styles.joinBtn}
        disabled={loading}
      >
        {loading ? "Joining..." : "Join Meeting"}
      </button>

      {/* INFO TEXT */}
      <p className={styles.text}>
        Please check your camera and microphone before joining
      </p>
    </div>
  );
}

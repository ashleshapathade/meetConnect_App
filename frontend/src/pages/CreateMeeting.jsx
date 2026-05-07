import React, { useEffect, useRef, useState } from "react";
import { Button, IconButton, TextField } from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useNavigate } from "react-router-dom";
import styles from "../styles/CreateMeeting.module.css";
import server from "../environment";
export default function CreateMeeting() {
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [copied, setCopied] = useState(false);

  // ✅ Stable Meeting ID (important)
  const [meetingId] = useState(() =>
    Math.random().toString(36).substring(2, 10),
  );

  const meetingLink = `${window.location.origin}/meeting/${meetingId}`;

  // ✅ REQUEST PERMISSION (USER CLICK BASED)
  const requestPermissions = async () => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      setMicOn(true);
      setCamOn(true);
    } catch (err) {
      alert("Please allow camera & microphone access from browser settings");
      console.log(err);
    }
  };

  // ✅ TOGGLE MIC
  const toggleMic = async () => {
    if (!stream) {
      await requestPermissions();
      return;
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setMicOn(audioTrack.enabled);
  };

  // ✅ TOGGLE CAMERA
  const toggleCam = async () => {
    if (!stream) {
      await requestPermissions();
      return;
    }

    let videoTrack = stream.getVideoTracks()[0];

    // if camera track missing → recreate
    if (!videoTrack) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const newVideoTrack = newStream.getVideoTracks()[0];

        stream.addTrack(newVideoTrack);
        videoRef.current.srcObject = stream;

        setCamOn(true);
      } catch (err) {
        alert("Camera permission required");
      }
      return;
    }

    videoTrack.enabled = !videoTrack.enabled;
    setCamOn(videoTrack.enabled);
  };

  // ✅ COPY LINK
  const copyLink = () => {
    navigator.clipboard.writeText(meetingLink);
    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  };

  // ✅ CLEANUP STREAM
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  const user =
    JSON.parse(localStorage.getItem("user")) ||
    JSON.parse(sessionStorage.getItem("user"));

  console.log("USER:", user);

  const createMeetingInDB = async () => {
    try {
      const res = await fetch(`${server.prod}/api/meeting/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meetingCode: meetingId,
          user_id: user?._id,
          hostName: user?.name,
        }),
      });

      console.log("Sending user_id:", user?._id);
      const data = await res.json();
      console.log("CREATE RESPONSE:", res.status, res.ok, data);

      if (!res.ok) {
        alert(
          `Meeting creation failed: ${data.message || data.error || "unknown error"}`,
        );
        return false;
      }

      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f5f5f5" }}>
      {/* LEFT PANEL */}
      <div
        style={{
          flex: 1,
          margin: "40px",
          background: "#1c1f2e",
          borderRadius: "15px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* VIDEO */}
        <video
          ref={videoRef}
          autoPlay
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* CAMERA OFF TEXT */}
        {!camOn && stream && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "white",
              fontSize: "20px",
              opacity: 0.8,
            }}
          >
            Camera is off
          </div>
        )}

        {/* ENABLE BUTTON */}
        {!stream && (
          <Button
            variant="contained"
            onClick={requestPermissions}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            Enable Camera & Mic
          </Button>
        )}

        {/* CONTROLS */}
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "20px",
          }}
        >
          {/* MIC */}
          <IconButton
            onClick={toggleMic}
            sx={{
              background: micOn ? "#fff" : "#ff4d4f",
              color: micOn ? "black" : "white",
              "&:hover": {
                background: micOn ? "#e0e0e0" : "#d9363e",
              },
            }}
          >
            {micOn ? <MicIcon /> : <MicOffIcon />}
          </IconButton>

          {/* CAMERA */}
          <IconButton
            onClick={toggleCam}
            sx={{
              background: camOn ? "#fff" : "#ff4d4f",
              color: camOn ? "black" : "white",
              "&:hover": {
                background: camOn ? "#e0e0e0" : "#d9363e",
              },
            }}
          >
            {camOn ? <VideocamIcon /> : <VideocamOffIcon />}
          </IconButton>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div
        style={{
          flex: 1,
          padding: "50px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#ffffff",
          borderRadius: "15px",
          margin: "40px",
          boxShadow: "0 5px 20px rgba(0,0,0,0.1)",
        }}
      >
        <button className={styles.backBtn} onClick={() => navigate("/home")}>
          ←
        </button>

        <h2 style={{ marginBottom: "50px" }}>Create Meeting</h2>

        {/* MEETING CODE */}
        <TextField
          label="Meeting Code"
          value={meetingId}
          fullWidth
          sx={{ mb: 3 }}
        />

        {/* LINK */}
        <h3 style={{ marginBottom: "10px" }}>Share the link</h3>

        <TextField
          value={meetingLink}
          fullWidth
          InputProps={{
            readOnly: true,
            endAdornment: (
              <IconButton onClick={copyLink}>
                <ContentCopyIcon color={copied ? "success" : "action"} />
              </IconButton>
            ),
          }}
        />

        {/* COPY STATUS */}
        {copied && (
          <span style={{ color: "green", fontSize: "12px", marginTop: "5px" }}>
            Copied!
          </span>
        )}

        {/* BUTTON */}
        <Button
          variant="contained"
          sx={{ mt: 4 }}
          onClick={async () => {
            const success = await createMeetingInDB();
            if (success) {
              // Save toggling state to sessionStorage
              sessionStorage.setItem(
                "zoom-meeting-initial-micOn",
                JSON.stringify(micOn),
              );
              sessionStorage.setItem(
                "zoom-meeting-initial-camOn",
                JSON.stringify(camOn),
              );
              navigate(`/meeting/${meetingId}`, {
                state: {
                  micOn,
                  camOn,
                },
              });
            }
          }}
        >
          Start Meeting
        </Button>
      </div>
    </div>
  );
}

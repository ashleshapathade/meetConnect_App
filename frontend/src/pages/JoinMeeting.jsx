import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/JoinMeeting.module.css";
import { useContext, useEffect } from "react";
import { AuthContext } from "../contexts/AuthContext";
import server from "../environment";
export default function JoinMeeting() {
  const [meetingId, setMeetingId] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [name, setName] = useState("");
  const isDisabled = !name || (!meetingId && !meetingLink);

  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // ✅ Set default name from DB
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user]);
  
  const extractMeetingCode = (link) => {
    try {
      const url = new URL(link);
      return url.pathname.split("/").pop();
    } catch {
      return null;
    }
  };
  const handleLinkChange = (e) => {
        const link = e.target.value;
        setMeetingLink(link);

        const code = extractMeetingCode(link);
        if (code) setMeetingId(code);
    };

  const handleJoin = async () => {
  if (!name) return alert("Enter your name");

  let code = meetingId;

  if (meetingLink) {
    code = extractMeetingCode(meetingLink);
  }

  if (!code) return alert("Enter Meeting ID or Link");

  try {
    const res = await fetch(`${server.prod}/api/meeting/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingCode: code,
        userName: name,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return alert(data.message);
    }

    // save user
    sessionStorage.setItem("userName", name);

    // 🔥 redirect to meeting room
    navigate(`/lobby/${code}`);

  } catch (err) {
    console.error(err);
  }
};
  return (
    <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => navigate("/home")}>
            ←
        </button>
      <div className={styles.card}>
        <h2>Join a Meeting</h2>
        <p className={styles.subtitle}>
        Enter your meeting details below
        </p>

        <input
          type="text"
          placeholder="Meeting ID"
          value={meetingId}
          onChange={(e) => setMeetingId(e.target.value)}
          className={styles.input}
        />

        <p className={styles.orText}>OR</p>

        <input
          type="text"
          placeholder="Meeting Link"
          value={meetingLink}
          onChange={handleLinkChange}
          className={styles.input}
        />

        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
        />

        <button
            onClick={handleJoin}
            className={styles.joinBtn}
            disabled={isDisabled}
            >
            Join Meeting
        </button>
      </div>
    </div>
  );
}
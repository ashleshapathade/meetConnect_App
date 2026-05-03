import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Badge, IconButton, TextField } from "@mui/material";
import { Button } from "@mui/material";
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import SendIcon from "@mui/icons-material/Send";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import { useNavigate } from "react-router-dom";
import server from "../environment";
import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext"; // adjust path if needed
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import CameraswitchIcon from "@mui/icons-material/Cameraswitch";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import CloseIcon from "@mui/icons-material/Close";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PanToolIcon from "@mui/icons-material/PanTool";

const server_url = server.dev;

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoMeetComponent() {
  const connectionsRef = useRef({});

  var socketRef = useRef();
  let socketIdRef = useRef();
  let localVideoref = useRef();
  const userMapRef = useRef({});
  const localStreamRef = useRef(null);

  // --- Camera/Mic Initial State Logic ---
  // Read from sessionStorage (set by Lobby/CreateMeeting), fallback to navigation state, fallback to false
  const getInitialToggle = (key, navValue) => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored);
      if (navValue !== undefined) return navValue;
    } catch {}
    return false;
  };
  // Use navigation state if available (for direct navigation), else sessionStorage
  let [video, setVideo] = useState(() =>
    getInitialToggle(
      "zoom-meeting-initial-camOn",
      window.history.state?.usr?.camOn,
    ),
  );
  let [audio, setAudio] = useState(() =>
    getInitialToggle(
      "zoom-meeting-initial-micOn",
      window.history.state?.usr?.micOn,
    ),
  );

  // Always persist toggling state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("zoom-meeting-initial-camOn", JSON.stringify(video));
  }, [video]);
  useEffect(() => {
    sessionStorage.setItem("zoom-meeting-initial-micOn", JSON.stringify(audio));
  }, [audio]);

  let [videoAvailable, setVideoAvailable] = useState(true);
  let [audioAvailable, setAudioAvailable] = useState(true);
  let [screen, setScreen] = useState(false);
  let [showModal, setModal] = useState(false);
  let [chat, setChat] = useState(false);
  let [screenAvailable, setScreenAvailable] = useState();
  let [messages, setMessages] = useState([]);
  let [message, setMessage] = useState("");
  let [newMessages, setNewMessages] = useState(0);
  let [askForUsername, setAskForUsername] = useState(true);

  let routeTo = useNavigate();

  const { user } = useContext(AuthContext);
  let [username, setUsername] = useState("");
  const [isHost, setIsHost] = useState(false);

  let [videos, setVideos] = useState([]);

  const videoRef = useRef([]);
  const [meetingId, setMeetingId] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [hostName, setHostName] = useState("");
  const [hostUserId, setHostUserId] = useState("");
  const [copied, setCopied] = useState(false);
  const [showEndMenu, setShowEndMenu] = useState(false);
  const [showUnmuteRequest, setShowUnmuteRequest] = useState(false);
  const [showStartVideoRequest, setShowStartVideoRequest] = useState(false);

  const [isFrontCamera, setIsFrontCamera] = useState(() => {
    const stored = sessionStorage.getItem("camera-facing-mode");
    return stored ? JSON.parse(stored) : true;
  });
  const [speakerOn, setSpeakerOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activePeerId, setActivePeerId] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [reactionQueue, setReactionQueue] = useState([]);

  const [showHostTools, setShowHostTools] = useState(false);

  // Waiting room feature
  // Persist waiting room state in localStorage (not always ON)
  const getInitialWaitingRoom = () => {
    const stored = localStorage.getItem("zoom-waiting-room-enabled");
    return stored !== null ? JSON.parse(stored) : false;
  };
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(getInitialWaitingRoom());
  const [waitingRoomUsers, setWaitingRoomUsers] = useState([]); // For host
  // Lock meeting feature
  const getInitialLockMeeting = () => {
    const stored = localStorage.getItem("zoom-lock-meeting-enabled");
    return stored !== null ? JSON.parse(stored) : false;
  };
  const [lockMeetingEnabled, setLockMeetingEnabled] = useState(getInitialLockMeeting());
  const [meetingLocked, setMeetingLocked] = useState(false); // for all users
  // Waiting room and rejoin state
  const [waitingForRejoin, setWaitingForRejoin] = useState(false);
  const [rejoinDenied, setRejoinDenied] = useState(false);
  const [rejoinRequests, setRejoinRequests] = useState([]); // for host
  // Waiting room: user-side state
  const [inWaitingRoom, setInWaitingRoom] = useState(false);


  // Persist waiting room toggle
  useEffect(() => {
    localStorage.setItem("zoom-waiting-room-enabled", JSON.stringify(waitingRoomEnabled));
  }, [waitingRoomEnabled]);
  // Persist lock meeting toggle
  useEffect(() => {
    localStorage.setItem("zoom-lock-meeting-enabled", JSON.stringify(lockMeetingEnabled));
  }, [lockMeetingEnabled]);
  const handleMuteUser = (socketId, enabled) => {
    socketRef.current?.emit("mute-user", {
      path: meetingId,
      socketId,
      enabled,
    });
  };

  const handleAskUnmute = (socketId) => {
    socketRef.current?.emit("ask-unmute", {
      path: meetingId,
      socketId,
    });
  };

  const handleAskStartVideo = (socketId) => {
    socketRef.current?.emit("ask-start-video", {
      path: meetingId,
      socketId,
    });
  };

  const handleMuteAll = () => {
    socketRef.current?.emit("mute-all", { path: meetingId });
  };
  const handleAskUnmuteAll = () => {
    socketRef.current?.emit("ask-unmute-all", { path: meetingId });
  };
  const handleStopAllVideo = () => {
    socketRef.current?.emit("stop-all-video", { path: meetingId });
  };
  const handleAskStartAllVideo = () => {
    socketRef.current?.emit("ask-start-video-all", { path: meetingId });
  };

const handleStopVideoUser = (socketId) => {
  socketRef.current?.emit("stop-video-user", {
    path: meetingId,
    socketId,
  });
};

const handleKickUser = (socketId) => {
  socketRef.current?.emit("kick-user", {
    path: meetingId,
    socketId,
  });
};

  const [toast, setToast] = useState({
    show: false,
    type: "", // "ended" | "left"
    message: "",
  });

  useEffect(() => {
    sessionStorage.setItem("camera-facing-mode", JSON.stringify(isFrontCamera));
  }, [isFrontCamera]);

  const reactionOptions = [
    "👍",
    "❤️",
    "👏",
    "✋",
    "😂",
    "😊",
    "😢",
    "😮",
    "🙌",
    "🎉",
    "😍",
    "🤔",
    "😴",
    "🤗",
    "🥳",
  ];

  const enqueueReaction = ({ emoji, username }) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setReactionQueue((prev) => [...prev, { id, emoji, username }]);
    setTimeout(() => {
      setReactionQueue((prev) => prev.filter((item) => item.id !== id));
    }, 5000);
  };

  const handleReaction = (option) => {
    if (!socketRef.current?.connected) return;

    const payload = {
      emoji: option,
      username,
      socketId: socketIdRef.current,
    };

    socketRef.current.emit("send-reaction", payload);
    enqueueReaction({
      username: "You",
      emoji: option,
    });
    setShowReactionsMenu(false);
  };

  useEffect(() => {
    setWaitingForRejoin(false);
    setRejoinDenied(false);
    setRejoinRequests([]);
    setWaitingRoomUsers([]);
    const fetchMeetingData = async () => {
      try {
        const meetingIdFromURL = window.location.pathname.split("/").pop();

        const res = await fetch(
          `${server_url}/api/meeting/${meetingIdFromURL}`,
        );
        const data = await res.json();

        if (!res.ok) {
          console.log("API ERROR:", res.status);
          return;
        }

        setMeetingId(data.meetingCode);
        setHostName(data.host);
        setMeetingLink(data.link);
        setHostUserId(data.hostUserId);
      } catch (err) {
        console.log("Error fetching meeting:", err);
      }
    };

    fetchMeetingData();
  }, []);

  // --- Remove local user from videos array if present (cleanup, just in case) ---
  useEffect(() => {
    const localSocketId = socketIdRef.current;
    if (!localSocketId) return;
    setVideos((prev) => prev.filter((v) => v.socketId !== localSocketId));
  }, [video, audio, screen, username, activePeerId]);

  useEffect(() => {
    const storedName = sessionStorage.getItem("userName");

    if (storedName) {
      setUsername(storedName); // ✅ priority to edited name
    } else if (user?.name) {
      setUsername(user.name); // fallback
    }
  }, [user]);

  useEffect(() => {
    if (user && hostUserId) {
      setIsHost(user._id === hostUserId);
    }
  }, [user, hostUserId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem("isReloading", "true");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(meetingLink);
    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  };

  const createMeeting = () => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.log("Socket not ready");
      return;
    }

    socketRef.current.emit("create-meeting", {
      meetingCode: meetingId,
      hostName,
      link: meetingLink,
    });
  };

  // TODO
  // if(isChrome() === false) {

  // }

  const saveMediaState = (newState) => {
    if (!meetingId) return;
    try {
      const current = {
        video: typeof newState.video === "boolean" ? newState.video : video,
        audio: typeof newState.audio === "boolean" ? newState.audio : audio,
      };
      sessionStorage.setItem(
        `zoom-meeting-${meetingId}-media`,
        JSON.stringify(current),
      );
    } catch (e) {
      console.log("Failed to save media state:", e);
    }
  };

  const restoreMediaState = () => {
    if (!meetingId) return;
    try {
      const stored = sessionStorage.getItem(`zoom-meeting-${meetingId}-media`);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (typeof parsed.video === "boolean") setVideo(parsed.video);
      if (typeof parsed.audio === "boolean") setAudio(parsed.audio);
    } catch (e) {
      console.log("Failed to restore media state:", e);
    }
  };

  const attachLocalStream = (stream) => {
    if (localVideoref.current) {
      localVideoref.current.srcObject = null;
      localVideoref.current.srcObject = new MediaStream(stream.getTracks());
      localVideoref.current
        .play()
        .catch((e) => console.log("local play failed", e));
    }
    localStreamRef.current = stream;
  };

  const stopStream = (stream) => {
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
  };

  const createPlaceholderStream = () => {
    if (!window.placeholderStream) {
      window.placeholderStream = new MediaStream([black(), silence()]);
    }
    return window.placeholderStream;
  };

  const replaceTrack = async (kind, track) => {
    if (!track) return;

    for (let id in connectionsRef.current) {
      const pc = connectionsRef.current[id];

      let sender = pc.getSenders().find((s) => s.track?.kind === kind);

      if (sender) {
        await sender.replaceTrack(track);
      } else {
        // ✅ ALWAYS attach with its OWN stream
        pc.addTrack(track, new MediaStream([track]));
      }
    }
  };

  const restoreCameraStream = async () => {
    if (!window.cameraStream) {
      await getUserMedia();
      return;
    }

    attachLocalStream(window.cameraStream);

    const cameraVideoTrack = window.cameraStream.getVideoTracks()[0];
    if (cameraVideoTrack) {
      await replaceTrack("video", cameraVideoTrack);
    }

    const cameraAudioTrack = window.cameraStream.getAudioTracks()[0];
    if (cameraAudioTrack) {
      await replaceTrack("audio", cameraAudioTrack);
    }
  };

  const getDisplayMedia = async () => {
    if (!navigator.mediaDevices.getDisplayMedia) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      await getDisplayMediaSucess(stream);
    } catch (e) {
      console.log(e);
    }
  };

  const getPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setVideoAvailable(!!stream.getVideoTracks().length);
      setAudioAvailable(!!stream.getAudioTracks().length);
      stopStream(stream);
      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
    } catch (error) {
      console.log(error);
      setVideoAvailable(false);
      setAudioAvailable(false);
      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
    }
  };

  useEffect(() => {
    getPermissions();
  }, []);

  useEffect(() => {
    restoreMediaState();
  }, [meetingId]);

  useEffect(() => {
    if (!socketRef.current) return;
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      Object.keys(connectionsRef.current).forEach((id) => {
        connectionsRef.current[id].close();
      });
      connectionsRef.current = {};
    };
  }, []);

  const getDisplayMediaSucess = async (stream) => {
    stopStream(window.screenStream);

    window.screenStream = stream;
    attachLocalStream(stream);

    const screenVideoTrack = stream.getVideoTracks()[0];
    if (screenVideoTrack) {
      await replaceTrack("video", screenVideoTrack);
    }

    stream.getTracks().forEach((track) => {
      track.onended = () => {
        setScreen(false);
        if (socketRef.current?.connected) {
          socketRef.current.emit("toggle-screen", {
            socketId: socketIdRef.current,
            enabled: false,
          });
        }
        restoreCameraStream();
      };
    });
  };

  const combineStreams = () => {
    const tracks = [];

    if (window.audioStream) {
      tracks.push(...window.audioStream.getAudioTracks());
    }

    if (window.cameraStream && !screen) {
      tracks.push(...window.cameraStream.getVideoTracks());
    }

    if (tracks.length > 0) {
      const combinedStream = new MediaStream(tracks);
      attachLocalStream(combinedStream);
      return combinedStream;
    }

    return null;
  };

  const getUserMediaSuccess = (stream) => {
    // This function is now mainly for backward compatibility
    // Individual streams are handled separately
    window.cameraStream = stream;

    // Combine streams for local display
    combineStreams();

    const cameraVideoTrack = stream.getVideoTracks()[0];
    const cameraAudioTrack = stream.getAudioTracks()[0];

    if (cameraVideoTrack) {
      cameraVideoTrack.enabled = video;
      replaceTrack("video", cameraVideoTrack);
    }

    if (cameraAudioTrack) {
      cameraAudioTrack.enabled = audio;
      replaceTrack("audio", cameraAudioTrack);
    }

    stream.getTracks().forEach((track) => {
      track.onended = () => {
        setVideo(false);
        setAudio(false);
        try {
          const tracks = localVideoref.current.srcObject?.getTracks() || [];
          tracks.forEach((track) => track.stop());
        } catch (e) {
          console.log(e);
        }
        const blackSilence = new MediaStream([black(), silence()]);
        attachLocalStream(blackSilence);
      };
    });
  };

  const silence = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  const black = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    canvas.getContext("2d").fillRect(0, 0, width, height);
    const stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  const getAudioStream = async () => {
    if (!audioAvailable) return null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      stream.getAudioTracks().forEach((track) => {
        track.enabled = audio;
      });

      // Set up audio analysis for speaking detection
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const mic = audioContext.createMediaStreamSource(stream);

      mic.connect(analyser);
      analyser.fftSize = 512;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkSpeaking = () => {
        analyser.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((a, b) => a + b, 0);
        setIsSpeaking(volume > 2000);
        requestAnimationFrame(checkSpeaking);
      };
      checkSpeaking();

      window.audioStream = stream;
      return stream;
    } catch (err) {
      console.log("Audio stream error:", err);
      return null;
    }
  };

  const getVideoStream = async (useFrontCamera = isFrontCamera) => {
    if (!videoAvailable) return null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: useFrontCamera ? "user" : "environment",
        },
      });
      stream.getVideoTracks().forEach((track) => {
        track.enabled = video;
      });
      window.videoStream = stream;
      return stream;
    } catch (err) {
      console.log("Video stream error:", err);
      return null;
    }
  };

  const getUserMedia = async (useFrontCamera = isFrontCamera) => {
    if (!videoAvailable && !audioAvailable) return null;

    const constraints = {
      video:
        video && videoAvailable
          ? {
              facingMode: useFrontCamera ? "environment" : "user",
            }
          : false,
      audio: audio && audioAvailable,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getVideoTracks().forEach((track) => {
        track.enabled = video;
      });
      stream.getAudioTracks().forEach((track) => {
        track.enabled = audio;
      });
      getUserMediaSuccess(stream);
      return stream;
    } catch (err) {
      console.log(err);
      return null;
    }
  };

  useEffect(() => {
    // On join, if camera is ON, get video stream before creating peer connections
    if (meetingId) {
      if (video) {
        getVideoStream().then(() => {
          getUserMedia();
        });
      } else {
        getUserMedia();
      }
    }
  }, [meetingId, isFrontCamera, videoAvailable, audioAvailable]);

  const createPeerConnection = (id, username) => {
    if (connectionsRef.current[id]) {
      return connectionsRef.current[id];
    }

    const pc = new RTCPeerConnection(peerConfigConnections);

    connectionsRef.current[id] = pc;
    userMapRef.current[id] = username;

    pc.isMakingOffer = false;
    pc.ignoreOffer = false;
    pc.isPolite = socketIdRef.current ? socketIdRef.current > id : false;

    pc.onnegotiationneeded = async () => {
      if (pc.isMakingOffer || pc.ignoreOffer) return;

      try {
        if (!socketRef.current) return;
        pc.isMakingOffer = true;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socketRef.current.emit(
          "signal",
          id,
          JSON.stringify({
            sdp: pc.localDescription,
          }),
        );
      } catch (err) {
        console.log(err);
      } finally {
        pc.isMakingOffer = false;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit(
          "signal",
          id,
          JSON.stringify({
            ice: event.candidate,
          }),
        );
      }
    };

    pc.ontrack = (event) => {
      setVideos((prev) => {
        const existing = prev.find((v) => v.socketId === id);

        if (existing) {
          return prev.map((v) =>
            v.socketId === id ? { ...v, stream: event.streams[0] } : v,
          );
        }

        return [
          ...prev,
          {
            socketId: id,
            username: userMapRef.current[id] || "User",
            stream: event.streams[0],
            video: true,
            audio: true,
          },
        ];
      });
    };
    const cameraStream = window.cameraStream;
    const screenStream = window.screenStream;
    const audioStream = window.audioStream;

    const addAudioTrack = (stream) => {
      const track = stream?.getAudioTracks()?.[0];
      if (track) {
        pc.addTrack(track, stream);
        return true;
      }
      return false;
    };

    // ---------------- VIDEO ----------------
    if (screen && screenStream) {
      const screenTrack = screenStream.getVideoTracks()[0];
      if (screenTrack) {
        pc.addTrack(screenTrack, screenStream);
      }
    } else {
      // Always add video stream if camera is ON and available
      let videoTrack = null;
      let streamToUse = null;
      if (window.videoStream && video) {
        videoTrack = window.videoStream.getVideoTracks()[0];
        streamToUse = window.videoStream;
      } else if (cameraStream && video) {
        videoTrack = cameraStream.getVideoTracks()[0];
        streamToUse = cameraStream;
      }
      if (videoTrack && streamToUse) {
        pc.addTrack(videoTrack, streamToUse);
      }
    }

    // ---------------- AUDIO (ALWAYS INDEPENDENT) ----------------
    // let audioTrack = null;
    // if (window.audioStream && audio) {
    //   audioTrack = window.audioStream.getAudioTracks()?.[0];
    // }
    // if (audioTrack) {
    //   pc.addTrack(audioTrack, new MediaStream([audioTrack]));
    // }
    // ✅ ALWAYS attach audio stream (even if muted)
    if (window.audioStream) {
      const audioTrack = window.audioStream.getAudioTracks()[0];

      if (audioTrack) {
        audioTrack.enabled = audio; // mic ON/OFF control
        pc.addTrack(audioTrack, window.audioStream);
      }
    }
     else {
      // fallback (silence to keep connection stable)
      const placeholder = createPlaceholderStream();
      const silentTrack = placeholder.getAudioTracks()[0];
      if (silentTrack) {
        pc.addTrack(silentTrack, placeholder);
      }
    }
    return pc;
  };

  const gotMessageFromServer = async (fromId, message) => {
    const signal = JSON.parse(message);

    let pc = connectionsRef.current[fromId];

    if (!pc) {
      pc = createPeerConnection(fromId, userMapRef.current[fromId]);
    }
    if (!pc) {
      console.log("PC not ready, skipping signal");
      return;
    }

    if (pc.isMakingOffer === undefined) {
      pc.isMakingOffer = false;
    }
    if (pc.ignoreOffer === undefined) {
      pc.ignoreOffer = false;
    }
    if (pc.isPolite === undefined) {
      pc.isPolite = socketIdRef.current ? socketIdRef.current > fromId : false;
    }

    if (signal.sdp) {
      const desc = new RTCSessionDescription(signal.sdp);
      const readyForOffer = !pc.isMakingOffer && pc.signalingState === "stable";
      const offerCollision = desc.type === "offer" && !readyForOffer;

      pc.ignoreOffer = !pc.isPolite && offerCollision;
      if (pc.ignoreOffer) {
        console.log("Offer collision detected → ignoring");
        return;
      }

      try {
        await pc.setRemoteDescription(desc);

        if (desc.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socketRef.current.emit(
            "signal",
            fromId,
            JSON.stringify({
              sdp: pc.localDescription,
            }),
          );
        }
      } catch (e) {
        console.log("SDP ERROR:", e);
      }
    }

    if (signal.ice) {
      pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch((e) =>
        console.log("ICE ERROR:", e),
      );
    }
  };

  let sendMessage = () => {
    if (!message.trim()) return;

    const msgData = {
      sender: username,
      message: message,
      socketId: socketIdRef.current,
    };

    // ✅ INSTANT UI UPDATE
    setMessages((prev) => [
      ...prev,
      {
        sender: username,
        data: message,
        socketId: socketIdRef.current,
      },
    ]);

    socketRef.current.emit("chat-message", msgData);

    setMessage("");
  };

  const addMessage = ({ sender, message, socketId }) => {
    setMessages((prev) => {
      // ✅ prevent duplicate messages
      const exists = prev.some(
        (msg) =>
          msg.sender === sender &&
          msg.data === message &&
          msg.socketId === socketId,
      );
      if (exists) return prev;

      return [
        ...prev,
        {
          sender,
          data: message,
          socketId,
        },
      ];
    });
  };

  useEffect(() => {
    if (!user || !user._id || !meetingId || !hostUserId) return;

    if (!socketRef.current && user && user._id && meetingId && hostUserId) {
      const initConnection = async () => {
        await getAudioStream(); // ✅ ADD THIS
        if (videoAvailable) {
          await getVideoStream(); // optional
        } // optional but better
        connect();
        connectToSocketServer();
      };
      initConnection();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off("chat-message");
        socketRef.current = null;
      }
    };
  }, [username, meetingId]);

  //

  let connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });

    socketRef.current.on("signal", gotMessageFromServer);

    // Handle waiting room update (for host)

    socketRef.current.on("waiting-room-update", (users) => {
      // Always update state to avoid stale closure issues. 
      // The UI will conditionally render based on current isHost and waitingRoomEnabled states.
      setWaitingRoomUsers(users || []);
    });
    // Lock meeting state update
    socketRef.current.on("lock-meeting-update", (locked) => {
      // We don't set meetingLocked(locked) here, because meetingLocked is used
      // exclusively to show the blocking "Meeting Locked" popup.
      // Existing participants should just continue their meeting undisturbed.
    });
    // If user tries to join and meeting is locked
    socketRef.current.on("meeting-locked", () => {
      setMeetingLocked(true);
    });


    // Handle waiting for rejoin approval (for kicked user)
    socketRef.current.on("waiting-for-rejoin-approval", () => {
      setWaitingForRejoin(true);
      setRejoinDenied(false);
    });
    socketRef.current.on("rejoin-approved", () => {
      setWaitingForRejoin(false);
      setRejoinDenied(false);
      // Re-attempt join-call (auto reload page)
      window.location.reload();
    });
    socketRef.current.on("rejoin-denied", () => {
      setWaitingForRejoin(false);
      setRejoinDenied(true);
    });

    // Waiting room: user-side events
    socketRef.current.on("in-waiting-room", () => {
      setInWaitingRoom(true);
    });
    socketRef.current.on("admitted-to-meeting", async () => {
      setInWaitingRoom(false);
      // Re-emit join-call
      socketRef.current.emit("join-call", {
        path: meetingId,
        username: user?.name,
        userId: user?._id,
        isRefresh: false,
        isHost: String(user?._id) === String(hostUserId)
      });
      // Restore media state and emit correct events
      restoreMediaState();
      // Wait a tick for state to update
      setTimeout(() => {
        const stored = sessionStorage.getItem(`zoom-meeting-${meetingId}-media`);
        let parsed = { video: false, audio: false };
        if (stored) {
          try { parsed = JSON.parse(stored); } catch {}
        }
        if (parsed.video) {
          socketRef.current.emit("toggle-video", { socketId: socketRef.current.id, enabled: true });
        }
        if (parsed.audio) {
          socketRef.current.emit("toggle-audio", { socketId: socketRef.current.id, enabled: true });
        }
      }, 300);
    });

    // Host: receive rejoin requests
    socketRef.current.on("rejoin-request", (requests) => {
      setRejoinRequests(requests || []);
    });

    socketRef.current.on("connect", () => {
      Object.keys(connectionsRef.current).forEach((id) => {
        connectionsRef.current[id].close();
      });

      // 🔥 VERY IMPORTANT
      connectionsRef.current = {};
      setVideos([]);

      const meetingId = window.location.pathname.split("/").pop();

      socketRef.current.emit("join-call", {
        path: meetingId,
        username: user?.name,
        userId: user?._id,
        isRefresh: sessionStorage.getItem("isReloading") === "true",
        isHost: String(user?._id) === String(hostUserId)
      });
      
      // Sync lock and waiting room state on connect (host emits current state)
      if (String(user?._id) === String(hostUserId)) {
        socketRef.current.emit("toggle-lock-meeting", { path: meetingId, locked: lockMeetingEnabled });
        socketRef.current.emit("toggle-waiting-room", { path: meetingId, enabled: waitingRoomEnabled });
      }
      // If user is put in waiting room, show waiting message
      socketRef.current.off("in-waiting-room");
      socketRef.current.on("in-waiting-room", () => {
        setInWaitingRoom(true);
      });
        // Host: admit/remove user from waiting room
        const handleAdmitUser = (socketId) => {
          socketRef.current.emit("admit-user", { path: meetingId, socketId });
        };
        const handleRemoveFromWaitingRoom = (socketId) => {
          socketRef.current.emit("remove-from-waiting-room", { path: meetingId, socketId });
        };
      // ✅ RESET FLAG AFTER USING IT
      sessionStorage.removeItem("isReloading");

      socketIdRef.current = socketRef.current.id;

      if (video) {
        socketRef.current.emit("toggle-video", {
          socketId: socketIdRef.current,
          enabled: true,
        });
      }
      if (audio) {
        socketRef.current.emit("toggle-audio", {
          socketId: socketIdRef.current,
          enabled: true,
        });
      }

      socketRef.current.off("chat-message");
      socketRef.current.on("chat-message", addMessage);

      socketRef.current.off("user-left");
      socketRef.current.on("user-left", (id) => {
        // ❌ skip yourself
        if (id === socketIdRef.current) return;
        const username = userMapRef.current[id] || "User";
        const notifId = Date.now();

        setNotifications((prev) => [
          ...prev,
          {
            id: notifId,

            text: `${username} left the meeting`,
          },
        ]);

        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== notifId));
        }, 4000);

        if (connectionsRef.current[id]) {
          connectionsRef.current[id].close(); // 🔥 close connection
          delete connectionsRef.current[id]; // 🔥 remove it
        }

        setVideos((prev) => prev.filter((v) => v.socketId !== id));
        setParticipants((prev) => prev.filter((p) => p.socketId !== id));
      });

      socketRef.current.off("meeting-ended");
      socketRef.current.on("meeting-ended", () => {
        setToast({
          show: true,
          type: "ended",
          message: "Meeting ended by host",
        });

        try {
          let tracks = localVideoref.current?.srcObject?.getTracks();
          tracks?.forEach((track) => track.stop());
        } catch (e) {}

        routeTo("/home");
      });

      socketRef.current.off("user-refreshed");
      socketRef.current.on(
        "user-refreshed",
        ({
          oldSocketId,
          socketId,
          username,
          userId,
          video: userVideo = false,
          audio: userAudio = false,
          screen: userScreen = false,
        }) => {
          if (oldSocketId === socketIdRef.current) return;

          userMapRef.current[socketId] = username;

          if (connectionsRef.current[oldSocketId]) {
            connectionsRef.current[oldSocketId].close();
            delete connectionsRef.current[oldSocketId];
          }

          setVideos((prev) => prev.filter((v) => v.socketId !== oldSocketId));

          setParticipants((prev) => {
            const exists = prev.some((p) => p.socketId === oldSocketId);
            if (exists) {
              return prev.map((p) =>
                p.socketId === oldSocketId
                  ? {
                      ...p,
                      socketId,
                      username,
                      userId,
                      isHost: String(userId) === String(hostUserId),
                    }
                  : p,
              );
            }
            return [
              ...prev,
              {
                socketId,
                username,
                userId,
                isHost: String(userId) === String(hostUserId),
              },
            ];
          });

          createPeerConnection(socketId, username);

          setVideos((prev) => {
            const exists = prev.find((v) => v.socketId === socketId);
            if (exists) return prev;

            return [
              ...prev,
              {
                socketId,
                username,
                stream: null,
                video: userVideo,
                audio: userAudio,
                screen: userScreen,
              },
            ];
          });
        },
      );

      socketRef.current.on("all-users", (users) => {
        setWaitingForRejoin(false);
        setRejoinDenied(false);
        const newConnections = {};
        const remoteParticipants = [];

        users.forEach((remoteUser) => {
          if (remoteUser.socketId === socketIdRef.current) return;

          userMapRef.current[remoteUser.socketId] = remoteUser.username;

          const pc = createPeerConnection(
            remoteUser.socketId,
            remoteUser.username,
          );

          newConnections[remoteUser.socketId] = true;

          remoteParticipants.push({
            socketId: remoteUser.socketId,
            username: remoteUser.username,
            userId: remoteUser.userId,
            isHost: String(remoteUser.userId) === String(hostUserId),
          });

          setVideos((prev) => {
            const exists = prev.find((v) => v.socketId === remoteUser.socketId);
            if (exists) return prev;

            return [
              ...prev,
              {
                socketId: remoteUser.socketId,
                username: remoteUser.username,
                stream: null,
                video: remoteUser.video,
                audio: remoteUser.audio,
                screen: remoteUser.screen,
              },
            ];
          });
        });

        setParticipants(remoteParticipants);
      });

      socketRef.current.on("user-joined", (data) => {
        const {
          socketId,
          username,
          userId,
          video: userVideo = false,
          audio: userAudio = false,
          screen: userScreen = false,
        } = data;
        // ❌ skip yourself
        if (socketId === socketIdRef.current) return;
        userMapRef.current[socketId] = username;
        // 🔥 detect if host
        const isJoiningHost = String(userId) === String(hostUserId);

        const id = Date.now();

        setNotifications((prev) => [
          ...prev,
          {
            id,
            text: isJoiningHost
              ? `${username} (Host) joined the meeting`
              : `${username} joined the meeting`,
          },
        ]);

        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 4000);

        setParticipants((prev) => {
          const exists = prev.some((p) => p.socketId === socketId);
          if (exists) return prev;
          return [
            ...prev,
            {
              socketId,
              username,
              userId,
              isHost: String(userId) === String(hostUserId),
            },
          ];
        });

        createPeerConnection(socketId, username);

        setVideos((prev) => {
          const exists = prev.find((v) => v.socketId === socketId);
          if (exists) return prev;

          return [
            ...prev,
            {
              socketId,
              username,
              stream: null,
              video: userVideo,
              audio: userAudio,
              screen: userScreen,
            },
          ];
        });
      });

      socketRef.current.off("reaction");
      socketRef.current.on("reaction", ({ username: sender, emoji }) => {
        enqueueReaction({ username: sender, emoji });
      });

      socketRef.current.off("user-audio-toggle");
      socketRef.current.on("user-audio-toggle", ({ socketId, enabled }) => {
        setVideos((prev) =>
          prev.map((v) =>
            v.socketId === socketId ? { ...v, audio: enabled } : v,
          ),
        );
      });

      socketRef.current.off("user-video-toggle");
      socketRef.current.on("user-video-toggle", ({ socketId, enabled }) => {
        setVideos((prev) =>
          prev.map((v) =>
            v.socketId === socketId ? { ...v, video: enabled } : v,
          ),
        );
      });

      socketRef.current.off("user-screen-toggle");
      socketRef.current.on("user-screen-toggle", ({ socketId, enabled }) => {
        setVideos((prev) =>
          prev.map((v) =>
            v.socketId === socketId ? { ...v, screen: enabled } : v,
          ),
        );
      });

      // Handle forced mute/unmute from host
      // Handle forced mute from host
      socketRef.current.on("force-mute", async ({ enabled }) => {
        // Forced Mute
        const newState = enabled;
        setAudio(newState);
        saveMediaState({ audio: newState });
        sessionStorage.setItem("zoom-meeting-initial-micOn", JSON.stringify(newState));
        
        if (window.audioStream) {
          window.audioStream.getAudioTracks().forEach((track) => {
            track.enabled = enabled;
          });
        }
       
        
        if (socketRef.current?.connected) {
          socketRef.current.emit("toggle-audio", {
            socketId: socketIdRef.current,
            enabled: newState,
          });
        }
      });

      // Handle ask unmute request from host
      socketRef.current.on("ask-unmute", async () => {
        let isMuted = true;
        if (window.audioStream) {
          const track = window.audioStream.getAudioTracks()[0];
          if (track && track.enabled) {
            isMuted = false;
          }
        }
        if (isMuted) {
          setShowUnmuteRequest(true);
        }
      });        


      // Handle forced stop video from host
      socketRef.current.on("force-stop-video", async () => {
        setVideo(false);
        saveMediaState({ video: false });
        sessionStorage.setItem("zoom-meeting-initial-camOn", JSON.stringify(false));
        
        if (window.videoStream) {
          window.videoStream.getVideoTracks().forEach(track => {
            track.enabled = false;
          });
        }
        
        if (socketRef.current?.connected) {
          socketRef.current.emit("toggle-video", {
            socketId: socketIdRef.current,
            enabled: false,
          });
        }
      });

      // Handle ask start video request from host
      socketRef.current.on("ask-start-video", async () => {
        let isVideoOff = true;
        if (window.videoStream) {
          const track = window.videoStream.getVideoTracks()[0];
          if (track && track.enabled) {
            isVideoOff = false;
          }
        }
        if (isVideoOff) {
          setShowStartVideoRequest(true);
        }
      });

      // Handle being kicked from the meeting
      socketRef.current.on("kicked-from-meeting", () => {
        setToast({
          show: true,
          type: "left",
          message: "You were removed from the meeting by the host.",
        });
        // Clean up and redirect
        setTimeout(() => {
          routeTo("/home");
          // Optionally, disconnect socket and clear state
          socketRef.current?.disconnect();
        }, 2000);
      });
      
    });
  };

  let getMedia = () => {
    // Keep camera and mic off by default when entering the room.
    setVideo(false);
    setAudio(false);
  };

  let connect = () => {
    connectionsRef.current = {}; // 🔥 RESET CONNECTIONS
    setVideos([]); // 🔥 CLEAR OLD VIDEOS
    setAskForUsername(false);
  };

  const handleVideo = async () => {
    const newState = !video;
    setVideo(newState);
    saveMediaState({ video: newState });
    sessionStorage.setItem(
      "zoom-meeting-initial-camOn",
      JSON.stringify(newState),
    );

    // Get video stream if it doesn't exist
    if (!window.videoStream) {
      await getVideoStream();
    }

    if (window.videoStream) {
      const track = window.videoStream.getVideoTracks()[0];
      if (track) {
        track.enabled = newState;
        if (!screen) {
          await replaceTrack("video", track);
        }
      }
    }

    // Update local display with combined streams
    combineStreams();

    // ✅ ALWAYS emit toggle event to notify peers
    if (socketRef.current?.connected) {
      socketRef.current.emit("toggle-video", {
        socketId: socketIdRef.current,
        enabled: newState,
      });
    }
  };

  const handleAudio = async () => {
    const newState = !audio;
    setAudio(newState);
    saveMediaState({ audio: newState });
    sessionStorage.setItem(
      "zoom-meeting-initial-micOn",
      JSON.stringify(newState),
    );
    if (!window.audioStream) {
      await getAudioStream();
    }

    if (window.audioStream) {
      const track = window.audioStream.getAudioTracks()[0];

      if (track) {
        track.enabled = newState;

        // 🔥 CRITICAL FIX
        await replaceTrack("audio", track);

        // 🔥 ENSURE EVERY PEER HAS AUDIO TRACK
        Object.values(connectionsRef.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
          if (!sender && newState) {
            pc.addTrack(track, new MediaStream([track]));
          }
        });
      }
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit("toggle-audio", {
        socketId: socketIdRef.current,
        enabled: newState,
      });
    }
  };

  let handleScreen = async () => {
    const newState = !screen;
    setScreen(newState);

    if (!screen) {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      getDisplayMediaSucess(stream);
    } else {
      window.screenStream?.getTracks().forEach((track) => track.stop());
      restoreCameraStream();
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit("toggle-screen", {
        socketId: socketIdRef.current,
        enabled: newState,
      });
    }
  };

  let handleChat = () => {
    setChat(!chat);
    setModal(!showModal);
    setNewMessages(0);
  };

  const handleEndForAll = () => {
    if (!isHost) return;

    if (socketRef.current) {
      socketRef.current.emit("end-meeting-for-all");
    }

    try {
      let tracks = localVideoref.current?.srcObject?.getTracks();
      tracks?.forEach((track) => track.stop());
    } catch (e) {}

    routeTo("/home");
  };

  const handleLeave = () => {
    try {
      let tracks = localVideoref.current?.srcObject?.getTracks();
      tracks?.forEach((track) => track.stop());
    } catch (e) {}

    sessionStorage.removeItem("userName"); // ✅ ADD THIS
    socketRef.current?.emit("leave-meeting");
    socketRef.current?.disconnect(); // 🔥 IMPORTANT

    setToast({
      show: true,
      type: "left",
      message: "You left the meeting",
    });

    // setTimeout(() => {
    //     routeTo("/home");
    // }, 4000);
  };

  const handleCameraFlip = async () => {
    const nextCamera = !isFrontCamera;
    setIsFrontCamera(nextCamera);

    // Always allow camera flip if video is available, regardless of current video state
    if (videoAvailable) {
      // Stop current video stream if it exists
      if (window.videoStream) {
        window.videoStream.getTracks().forEach((track) => track.stop());
      }

      // Get new video stream with flipped camera
      await getVideoStream(nextCamera);

      if (window.videoStream) {
        const track = window.videoStream.getVideoTracks()[0];
        if (track) {
          track.enabled = video; // Respect current video state
          if (!screen) {
            await replaceTrack("video", track);
          }
        }
      }

      // Update local display with combined streams
      combineStreams();
    }
  };

  // --- Video grid swap logic ---
  // activePeerId: null means local is main, else remote is main
  const activePeer = videos.find((v) => v.socketId === activePeerId);

  // Helper to get the correct state for the local tile (when not main)
  const getLocalTileState = () => {
    if (!activePeer) {
      // Local is main
      return {
        video: video,
        audio: audio,
        screen: screen,
        stream: localStreamRef.current,
        isSpeaking,
        username: username,
      };
    } else {
      // Local is in grid (not main)
      return {
        video: video,
        audio: audio,
        screen: screen,
        stream: localStreamRef.current,
        isSpeaking,
        username: username,
      };
    }
  };

  // Helper to get the correct state for the remote tile (when not main)
  const getRemoteTileState = (videoItem) => {
    return {
      video: videoItem.video,
      audio: videoItem.audio,
      screen: videoItem.screen,
      stream: videoItem.stream,
      isSpeaking: false, // Optionally, add speaking detection per remote
      username: videoItem.username,
    };
  };

  // Render local tile (when not main)
  const renderLocalTile = () => {
    // Only show shared screen in local tile if this is the real local user (not a remote user on their own page)
    // The real local user is the one whose socketId matches socketIdRef.current
    // For all other users, always show their own camera/video/avatar
    const isRealLocalUser = true; // This component is only rendered for the real local user
    const isSharing = isRealLocalUser && screen && window.screenStream;
    return (
      <div
        key="local-tile"
        className={styles.videoCard}
        onClick={() => setActivePeerId(null)}
        style={{ cursor: "pointer" }}
      >
        {isSharing ? (
          <video
            ref={(ref) => {
              if (ref && window.screenStream && screen) {
                if (ref.srcObject !== window.screenStream) {
                  ref.srcObject = window.screenStream;
                }
                ref.play().catch((e) => console.log("play failed", e));
              }
            }}
            autoPlay
            muted
            playsInline
          />
        ) : video && localStreamRef.current ? (
          <video
            ref={(ref) => {
              if (ref && localStreamRef.current) {
                if (ref.srcObject !== localStreamRef.current) {
                  ref.srcObject = localStreamRef.current;
                }
                ref.play().catch((e) => console.log("play failed", e));
              }
            }}
            autoPlay
            muted
            playsInline
          />
        ) : (
          <div className={styles.avatarCircle}>
            {username?.charAt(0).toUpperCase()}
          </div>
        )}
        <div className={styles.userTag}>
          <span className={styles.micIcon}>
            {audio ? (
              <MicIcon style={{ fontSize: 16, color: "white" }} />
            ) : (
              <MicOffIcon style={{ fontSize: 16, color: "red" }} />
            )}
          </span>
          <span className={isSpeaking ? styles.speaking : ""}>You</span>
        </div>
      </div>
    );
  };

  const handleSpeaker = () => {
    setSpeakerOn((prev) => {
      const newState = !prev;

      videos.forEach((v) => {
        const videoEl = document.querySelector(
          `video[data-socket="${v.socketId}"]`,
        );
        if (videoEl) {
          videoEl.muted = !newState;
        }
      });

      return newState;
    });
  };


  // Host: admit/remove user from waiting room
  const handleAdmitUser = (socketId) => {
    socketRef.current.emit("admit-user", { path: meetingId, socketId });
  };
  const handleRemoveFromWaitingRoom = (socketId) => {
    socketRef.current.emit("remove-from-waiting-room", { path: meetingId, socketId });
  };

  // Host: approve/deny rejoin
  const handleApproveRejoin = (userId) => {
    socketRef.current.emit("approve-rejoin", { path: meetingId, userId });
  };
  const handleDenyRejoin = (userId) => {
    socketRef.current.emit("deny-rejoin", { path: meetingId, userId });
  };

  return (
    <div className={styles.meetVideoContainer}>
      {/* HEADER */}
      <div className={styles.meetingHeader}>
        <h3>Video Meeting</h3>
        {isHost && (
          <details className={styles.dropdown}>
            <summary className={styles.dropdownSummary}>Meeting Info</summary>

            <div className={styles.dropdownContent}>
              <h3 className={styles.title}>Meeting Details</h3>

              <div className={styles.infoRow}>
                <span className={styles.label}>Host:</span>
                <span className={styles.value}>{hostName}</span>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.label}>Meeting ID:</span>
                <span className={styles.value}>{meetingId}</span>
              </div>

              <div className={styles.linkBox}>
                <input
                  type="text"
                  value={meetingLink}
                  readOnly
                  className={styles.linkInput}
                />

                <button className={styles.copyBtn} onClick={copyLink}>
                  Copy
                </button>
              </div>

              {/* COPY STATUS */}
              {copied && (
                <div className={styles.copiedToast}>
                  ✔ Link copied successfully!
                </div>
              )}
            </div>
          </details>
        )}
      </div>


      {/* Waiting for rejoin approval (kicked user) */}
      {waitingForRejoin && (
        <div className={styles.waitingRoomPanel}>
          <h3>Waiting for host approval to rejoin…</h3>
          <div style={{fontSize:16, color:'#bbb', marginTop:8, textAlign:'center'}}>You have requested to rejoin the meeting.<br/>Please wait for the host to approve your request.</div>
        </div>
      )}
      {rejoinDenied && (
        <div className={styles.waitingRoomPanel}>
          <h3>Host denied your rejoin request</h3>
          <div style={{fontSize:16, color:'#bbb', marginTop:8, textAlign:'center'}}>You cannot rejoin this meeting unless the host allows you.</div>
        </div>
      )}
      {/* Waiting Room: user-side message */}
      {inWaitingRoom && !isHost && (
        <div className={styles.waitingRoomPanel}>
          <h3>Waiting Room</h3>
          <div style={{fontSize:16, color:'#bbb', marginTop:8, textAlign:'center'}}>You are in the waiting room.<br/>Please wait for the host to admit you.</div>
        </div>
      )}



      {/* Host Tools Panel (with Waiting Room and Lock Meeting toggles) */}
      {showHostTools && isHost && (
        <div className={styles.hostToolsPanel}>
          <div className={styles.hostToolsHeader}>
            <span>Host Tools</span>
            <IconButton size="small" onClick={() => setShowHostTools(false)} style={{ color: "#fff" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>
          {/* Waiting Room Toggle */}
          <div className={styles.waitingRoomToggleRow}>
            <span className={styles.waitingRoomLabel}>Waiting Room</span>
            <label className={styles.switch}>
              <input type="checkbox" checked={waitingRoomEnabled} onChange={e => {
                setWaitingRoomEnabled(e.target.checked);
                if (socketRef.current) {
                  socketRef.current.emit("toggle-waiting-room", { path: meetingId, enabled: e.target.checked });
                }
              }} />
              <span className={styles.slider}></span>
            </label>
            <span className={waitingRoomEnabled ? styles.waitingRoomOn : styles.waitingRoomOff}>
              {waitingRoomEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
          {/* Lock Meeting Toggle */}
          <div className={styles.waitingRoomToggleRow} style={{marginTop:0}}>
            <span className={styles.waitingRoomLabel}>Lock Meeting</span>
            <label className={styles.switch}>
              <input type="checkbox" checked={lockMeetingEnabled} onChange={e => {
                setLockMeetingEnabled(e.target.checked);
                if (socketRef.current) {
                  socketRef.current.emit("toggle-lock-meeting", { path: meetingId, locked: e.target.checked });
                }
              }} />
              <span className={styles.slider}></span>
            </label>
            <span className={lockMeetingEnabled ? styles.waitingRoomOn : styles.waitingRoomOff}>
              {lockMeetingEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
          <div className={styles.hostToolsAllBtns} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 15px', borderBottom: '1px solid #444' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className={styles.hostActionBtn} style={{ flex: 1 }} onClick={handleMuteAll}>Mute All</button>
              <button className={styles.hostActionBtn} style={{ flex: 1 }} onClick={handleAskUnmuteAll}>Unmute All</button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className={styles.hostActionBtn} style={{ flex: 1 }} onClick={handleStopAllVideo}>Stop All Video</button>
              <button className={styles.hostActionBtn} style={{ flex: 1 }} onClick={handleAskStartAllVideo}>Start All Video</button>
            </div>
          </div>
          <div className={styles.hostToolsList}>
            {participants.filter((p) => p.socketId !== socketIdRef.current).length === 0 ? (
              <div className={styles.hostNoParticipants}>No other participants</div>
            ) : (
              participants
                .filter((p) => p.socketId !== socketIdRef.current)
                .map((participant) => (
                  <div key={participant.socketId} className={styles.participantRow}>
                    <span>{participant.username}</span>
                    <div className={styles.hostToolsActionBtns}>
                      <button className={styles.hostActionBtn} onClick={() => handleMuteUser(participant.socketId, false)}>
                        Mute
                      </button>
                      <button className={styles.hostActionBtn} onClick={() => handleAskUnmute(participant.socketId)}>
                        Unmute
                      </button>
                      <button className={styles.hostActionBtn} onClick={() => handleStopVideoUser(participant.socketId)}>
                        Stop Video
                      </button>
                      <button className={styles.hostActionBtn} onClick={() => handleAskStartVideo(participant.socketId)}>
                        Start Video
                      </button>
                      <button className={styles.hostKickBtn} onClick={() => handleKickUser(participant.socketId)}>
                        Kick
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
      {/* Meeting Locked Popup */}
      {meetingLocked && !isHost && (
        <div className={styles.waitingRoomPanel}>
          <h3>Meeting Locked</h3>
          <div style={{fontSize:16, color:'#bbb', marginTop:8, textAlign:'center'}}>The host has locked this meeting.<br/>No new participants can join at this time.</div>
        </div>
      )}

      {/* Host: show waiting room panel if enabled */}
      {isHost && waitingRoomEnabled && waitingRoomUsers.length > 0 && (
        <div className={styles.waitingRoomPanel}>
          <h3>Waiting Room</h3>
          {waitingRoomUsers.map((user) => (
            <div key={user.socketId} className={styles.rejoinRequestRow}>
              <span className={styles.rejoinUserName}>{user.username}</span>
              <button className={styles.rejoinApproveBtn} onClick={() => handleAdmitUser(user.socketId)}>
                Admit
              </button>
              <button className={styles.rejoinDenyBtn} onClick={() => handleRemoveFromWaitingRoom(user.socketId)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Host: show rejoin requests */}
      {isHost && rejoinRequests.length > 0 && (
        <div className={styles.waitingRoomPanel}>
          <h3>Rejoin Requests</h3>
          {rejoinRequests.map((req) => (
            <div key={req.userId} className={styles.rejoinRequestRow}>
              <span className={styles.rejoinUserName}>{req.username}</span>
              <button className={styles.rejoinApproveBtn} onClick={() => handleApproveRejoin(req.userId)}>
                Approve
              </button>
              <button className={styles.rejoinDenyBtn} onClick={() => handleDenyRejoin(req.userId)}>
                Deny
              </button>
            </div>
          ))}
        </div>
      )}

      {/* CHAT */}
      {showModal && (
        <div className={styles.chatRoom}>
          <h3 style={{ color: "black" }}>Chat Here</h3>

          <div className={styles.chattingDisplay}>
            {messages.map((item, i) => {
              const isMe = item.socketId === socketIdRef.current;

              return (
                <div
                  key={i}
                  className={isMe ? styles.myMessage : styles.otherMessage}
                >
                  <div className={styles.messageBox}>
                    {/* ✅ Username top */}
                    <div className={styles.senderName}>
                      {isMe ? "You" : item.sender}
                    </div>

                    {/* ✅ Message */}
                    <div className={styles.messageText}>{item.data}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.chattingArea}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
            />
            <button onClick={sendMessage} className={styles.sendBtn}>
              ➤
            </button>
          </div>
        </div>
      )}

      {/* VIDEO GRID */}
      <div className={styles.videoGrid}>
        <div className={styles.videoCardLarge}>
          {/* Show controls only if local user is in main video grid */}
          {activePeer == null && (
            <div className={styles.videoTopControls}>
              <IconButton size="small" onClick={handleCameraFlip}>
                <CameraswitchIcon style={{ color: "white" }} />
              </IconButton>

              <IconButton size="small" onClick={handleSpeaker}>
                {speakerOn ? (
                  <VolumeUpIcon style={{ color: "white" }} />
                ) : (
                  <VolumeOffIcon style={{ color: "white" }} />
                )}
              </IconButton>
            </div>
          )}

          {/* Main video grid: only show local shared screen if this is the real local user and sharing */}
          {activePeer == null && screen && window.screenStream ? (
            // Only the real local user, when they are main, sees their own shared screen
            <video
              ref={(ref) => {
                if (ref && window.screenStream) {
                  if (ref.srcObject !== window.screenStream) {
                    ref.srcObject = window.screenStream;
                  }
                  ref.play().catch((e) => console.log("play failed", e));
                }
              }}
              autoPlay
              muted
              playsInline
            />
          ) : activePeer ? (
            <>
              <video
                style={{
                  display: activePeer.stream && (activePeer.video || activePeer.screen) ? "block" : "none",
                }}
                ref={(ref) => {
                  if (ref && activePeer.stream) {
                    if (ref.srcObject !== activePeer.stream) {
                      ref.srcObject = activePeer.stream;
                    }
                    ref.play().catch((e) => console.log("play failed", e));
                  }
                }}
                autoPlay
                playsInline
                muted={false}
              />
              {!(activePeer.stream && (activePeer.video || activePeer.screen)) && (
                <div className={styles.avatarCircle}>
                  {activePeer.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </>
          ) : video && localStreamRef.current ? (
            <video
              ref={(ref) => {
                if (ref && localStreamRef.current) {
                  if (ref.srcObject !== localStreamRef.current) {
                    ref.srcObject = localStreamRef.current;
                  }
                  ref.play().catch((e) => console.log("play failed", e));
                }
              }}
              autoPlay
              muted
              playsInline
            />
          ) : (
            <div className={styles.avatarCircle}>
              {username?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className={styles.userTag}>
            <span className={styles.micIcon}>
              {activePeer ? (
                activePeer.audio ? (
                  <MicIcon style={{ fontSize: 16, color: "white" }} />
                ) : (
                  <MicOffIcon style={{ fontSize: 16, color: "red" }} />
                )
              ) : audio ? (
                <MicIcon style={{ fontSize: 16, color: "white" }} />
              ) : (
                <MicOffIcon style={{ fontSize: 16, color: "red" }} />
              )}
            </span>

            <span className={isSpeaking ? styles.speaking : ""}>
              {activePeer
                ? `${activePeer.username || "User"}`
                : `${username} (You)`}
            </span>
          </div>
        </div>

        {activePeer && renderLocalTile()}
        {videos
          .filter((videoItem) => videoItem.socketId !== activePeerId)
          .map((videoItem) => (
            <div
              key={videoItem.socketId}
              className={styles.videoCard}
              onClick={() => setActivePeerId(videoItem.socketId)}
              style={{ cursor: "pointer" }}
            >
              <video
                style={{
                  display: videoItem.video || videoItem.screen ? "block" : "none",
                }}
                key={
                  videoItem.socketId +
                  "-" +
                  videoItem.video +
                  "-" +
                  videoItem.screen
                }
                data-socket={videoItem.socketId}
                ref={(ref) => {
                  if (ref && videoItem.stream) {
                    if (ref.srcObject !== videoItem.stream) {
                      ref.srcObject = videoItem.stream;
                    }
                    ref.play().catch((e) => console.log("play failed", e));
                  }
                }}
                autoPlay
                playsInline
                muted={false}
              />
              {!(videoItem.video || videoItem.screen) && (
                <div className={styles.avatarCircle}>
                  {videoItem.username?.charAt(0).toUpperCase()}
                </div>
              )}

              <div className={styles.userTag}>
                <span>
                  {videoItem.audio ? (
                    <MicIcon style={{ fontSize: 16, color: "white" }} />
                  ) : (
                    <MicOffIcon style={{ fontSize: 16, color: "red" }} />
                  )}
                </span>

                <span>{videoItem.username || "User"}</span>
              </div>
            </div>
          ))}
      </div>

      {showEndMenu && (
        <>
          <div
            className={styles.overlay}
            onClick={() => setShowEndMenu(false)}
          />

          <div className={styles.endPopup}>
            {isHost && (
              <button onClick={handleEndForAll} className={styles.popupBtn}>
                End Meeting for All
              </button>
            )}

            <button onClick={handleLeave} className={styles.popupBtn}>
              Leave Meeting
            </button>

            <button
              onClick={() => setShowEndMenu(false)}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {showUnmuteRequest && (
        <>
          <div
            className={styles.overlay}
            onClick={() => setShowUnmuteRequest(false)}
          />

          <div className={styles.endPopup}>
            <h4 style={{ color: "white", marginBottom: "20px", textAlign: "center" }}>
              The host would like you to unmute your microphone.
            </h4>
            
            <button 
              onClick={() => { 
                setShowUnmuteRequest(false);
                handleAudio(); 
              }} 
              className={styles.popupBtn}
            >
              Unmute
            </button>

            <button
              onClick={() => setShowUnmuteRequest(false)}
              className={styles.cancelBtn}
            >
              Stay Muted
            </button>
          </div>
        </>
      )}

      {showStartVideoRequest && (
        <>
          <div
            className={styles.overlay}
            onClick={() => setShowStartVideoRequest(false)}
          />

          <div className={styles.endPopup}>
            <h4 style={{ color: "white", marginBottom: "20px", textAlign: "center" }}>
              The host would like you to start your video.
            </h4>
            
            <button 
              onClick={() => { 
                setShowStartVideoRequest(false);
                handleVideo(); 
              }} 
              className={styles.popupBtn}
            >
              Start Video
            </button>

            <button
              onClick={() => setShowStartVideoRequest(false)}
              className={styles.cancelBtn}
            >
              Stay Hidden
            </button>
          </div>
        </>
      )}

      {toast.show && (
        <div className={styles.toastContainer}>
          <div
            className={` 
                    ${styles.toast} 
                    ${toast.type === "ended" ? styles.toastEnd : styles.toastLeft}
                `}
          >
            <h4>{toast.message}</h4>

            <p>Redirecting soon...</p>

            <div className={styles.toastActions}>
              {/* 🔄 Rejoin button */}
              <button
                onClick={() => {
                  setToast({ show: false });

                  // simple reload to rejoin
                  window.location.reload();
                }}
                className={styles.rejoinBtn}
              >
                Rejoin
              </button>

              {/* ⏭ Go Home */}
              <button
                onClick={() => routeTo("/home")}
                className={styles.homeBtn}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.notificationContainer}>
        {notifications.map((n) => (
          <div key={n.id} className={styles.notification}>
            {n.text}
          </div>
        ))}
      </div>

      {showParticipants && (
        <div className={styles.participantsPanel}>
          <div
            className={styles.panelHeader}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Participants</span>
            <IconButton
              size="small"
              onClick={() => setShowParticipants(false)}
              style={{ color: "white" }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>
          <div className={styles.participantRow}>
            <span>{username || "You"} (You)</span>
            {isHost && <span className={styles.participantLabel}>Host</span>}
          </div>
          {participants.length === 0 ? (
            <div className={styles.participantRow}>No other participants</div>
          ) : (
            participants.map((participant) => (
              <div key={participant.socketId} className={styles.participantRow}>
                <span>{participant.username}</span>
                <span className={styles.participantLabel}>
                  {participant.isHost ? "Host" : ""}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {showReactionsMenu && (
        <div className={styles.reactionsPanel}>
          <IconButton
            size="small"
            onClick={() => setShowReactionsMenu(false)}
            className={styles.reactionsPanelClose}
            style={{ position: 'absolute', top: 10, right: 10, color: '#fff', zIndex: 2 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          {reactionOptions.map((emoji) => (
            <button
              type="button"
              key={emoji}
              className={styles.reactionBtn}
              onClick={() => handleReaction(emoji)}
            >
              <span style={{ fontSize: 20 }}>{emoji}</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.reactionToastContainer}>
        {reactionQueue.map((reaction) => (
          <div key={reaction.id} className={styles.reactionToast}>
            <span>{reaction.emoji}</span>
            <span>{reaction.username}</span>
          </div>
        ))}
      </div>

      {/* ✅ CONTROLS FIXED */}
      <div className={styles.controlsWrapper}>
        <div className={styles.controlsBar}>
          <IconButton onClick={handleAudio} className={styles.controlBtn}>
            {audio ? <MicIcon /> : <MicOffIcon />}
          </IconButton>

          <IconButton onClick={handleVideo} className={styles.controlBtn}>
            {video ? <VideocamIcon /> : <VideocamOffIcon />}
          </IconButton>

          {screenAvailable && (
            <IconButton onClick={handleScreen} className={styles.controlBtn}>
              {screen ? <ScreenShareIcon /> : <StopScreenShareIcon />}
            </IconButton>
          )}

          <IconButton onClick={handleChat} className={styles.controlBtn}>
            {chat ? <ChatIcon /> : <ChatOutlinedIcon />}
          </IconButton>

          {/* More menu for Participants and Reactions */}
          <IconButton
            onClick={() => setShowMoreMenu((prev) => !prev)}
            className={styles.controlBtn}
          >
            <MoreVertIcon />
          </IconButton>

          <IconButton
            onClick={() => setShowEndMenu(true)}
            className={styles.endCallBtn}
          >
            <CallEndIcon />
          </IconButton>
        </div>

        {/* More menu popup */}
        {showMoreMenu && (
          <div className={styles.moreMenuPopup}>
            <IconButton
              size="small"
              onClick={() => setShowMoreMenu(false)}
              className={styles.moreMenuClose}
              style={{ position: 'absolute', top: 10, right: 10, color: '#fff', zIndex: 2 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            <div className={styles.moreMenuRow}>
              <Badge
                badgeContent={participants.length + 1}
                color="primary"
                overlap="circular"
              >
                <button
                  className={styles.moreMenuBtn}
                  onClick={() => {
                    setShowParticipants((prev) => !prev);
                    setShowReactionsMenu(false);
                    setShowMoreMenu(false);
                  }}
                >
                  <PeopleAltIcon className={styles.moreMenuIcon} />
                  <span className={styles.moreMenuLabel}>Participants</span>
                </button>
              </Badge>
              <button
                className={styles.moreMenuBtn}
                onClick={() => {
                  setShowReactionsMenu((prev) => !prev);
                  setShowParticipants(false);
                  setShowMoreMenu(false);
                }}
              >
                <EmojiEmotionsIcon className={styles.moreMenuIcon} />
                <span className={styles.moreMenuLabel}>React</span>
              </button>
              {isHost && (
                <button
                  className={styles.moreMenuBtn}
                  onClick={() => {
                    setShowHostTools(true);
                    setShowMoreMenu(false);
                  }}
                >
                  <PanToolIcon className={styles.moreMenuIcon} />
                  <span className={styles.moreMenuLabel}>Host Tools</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* (Duplicate Host Tools panel removed for UI consistency) */}


      </div>
    </div>
  );
}

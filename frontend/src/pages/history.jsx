import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import HomeIcon from "@mui/icons-material/Home";
import { IconButton } from "@mui/material";

export default function History() {
  const { getHistoryOfUser } = useContext(AuthContext);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const routeTo = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await getHistoryOfUser();
        setMeetings(history || []);
      } catch (err) {
        setError("Unable to load meeting history.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [getHistoryOfUser]);

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const time = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${day}/${month}/${year} ${time}`;
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 1 }}>
        <IconButton onClick={() => routeTo("/home")} color="primary">
          <HomeIcon />
        </IconButton>
        <Typography variant="h5" component="h1">
          Meeting History
        </Typography>
      </Box>

      {loading && (
        <Typography color="text.secondary">
          Loading your meeting history...
        </Typography>
      )}

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {!loading && meetings.length === 0 && (
        <Typography color="text.secondary">No meetings found yet.</Typography>
      )}

      <Box sx={{ display: "grid", gap: 2 }}>
        {meetings.map((meeting, index) => (
          <Card key={meeting.meetingCode || index} variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Meeting Code
              </Typography>
              <Typography variant="h6" gutterBottom>
                {meeting.meetingCode || "Unknown"}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Host: {meeting.hostName || "Unknown"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Created: {formatDate(meeting.createdAt || meeting.date)}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ wordBreak: "break-all", mt: 1 }}
              >
                Link:{" "}
                {meeting.link ? (
                  <a href={meeting.link} target="_blank" rel="noreferrer">
                    {meeting.link}
                  </a>
                ) : (
                  "Not available"
                )}
              </Typography>
            </CardContent>
            {meeting.link && (
              <CardActions>
                <Button
                  size="small"
                  color="primary"
                  onClick={() => window.open(meeting.link, "_blank")}
                >
                  Open Meeting
                </Button>
              </CardActions>
            )}
          </Card>
        ))}
      </Box>
    </Box>
  );
}

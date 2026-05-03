import * as React from "react";
import server from "../environment";
import {
  Avatar,
  Button,
  TextField,
  Paper,
  Box,
  Grid,
  Typography,
  Snackbar,
  Link
} from "@mui/material";
import LockResetIcon from "@mui/icons-material/LockReset";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      setOpen(true);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${server.prod}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to send reset link");
        setOpen(true);
        return;
      }

      setSuccess("Reset link sent to your email");
      setOpen(true);
      setEmail("");

      setTimeout(() => {
        navigate("/auth");
      }, 3000);
    } catch (err) {
      setError("Something went wrong");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container component="main" sx={{ height: "100vh" }}>
      <Grid
        item
        xs={false}
        sm={4}
        md={7}
        sx={{
          backgroundImage:
            'url("https://img.freepik.com/free-vector/password-reset-concept-illustration_114360-7965.jpg")',
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
        <Box
          sx={{
            my: 8,
            mx: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
            <LockResetIcon />
          </Avatar>

          <Typography component="h1" variant="h5">
            Forgot Password
          </Typography>

          <Typography sx={{ mt: 1, textAlign: "center", color: "gray" }}>
            Enter your email and we will send a reset link
          </Typography>

          <Box sx={{ mt: 3, width: "100%" }}>
            <TextField
              fullWidth
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>

            {/* Back to login */}
            <Typography align="center">
              <Link
                component="button"
                onClick={() => navigate("/auth")}
              >
                <ArrowBackIcon fontSize="small" /> Back to Login
              </Link>
            </Typography>

            {/* Signup link */}
            <Typography align="center" sx={{ mt: 2 }}>
              Don't have an account?{" "}
              <Link
                component="button"
                onClick={() => navigate("/auth")}
              >
                Sign Up
              </Link>
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* Snackbar */}
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
        message={error || success}
      />
    </Grid>
  );
}
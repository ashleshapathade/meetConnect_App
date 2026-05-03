import * as React from "react";
import {
  Avatar,Button,TextField,Paper,Box,Grid,Typography,Snackbar,Link} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import {  useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";

   

export default function ResetPassword() {
  //const [searchParams] = useSearchParams();
  const navigate = useNavigate();

   const { token } = useParams();
 
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  // validation
  const passwordValid =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!token) {
      setError("Invalid reset token");
      setOpen(true);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setOpen(true);
      return;
    }

    if (!passwordValid) {
      setError("Password does not meet requirements");
      setOpen(true);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "http://localhost:8000/api/auth/reset-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            newPassword: password,
            
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to reset password");
        setOpen(true);
        return;
      }

      setSuccess("Password reset successful");
      setOpen(true);

      setTimeout(() => {
        navigate("/auth");
      }, 3000);
    } catch (err) {
      setError("Server error. Try again later.");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // SUCCESS SCREEN
  if (success) {
    return (
      <Grid container sx={{ height: "100vh" }}>
        <Grid item xs={12} md={12}>
          <Box sx={{ textAlign: "center", mt: 10 }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: "green" }} />
            <Typography variant="h5" sx={{ mt: 2 }}>
              Password Reset Successful
            </Typography>
            <Button
              sx={{ mt: 3 }}
              variant="contained"
              onClick={() => navigate("/auth")}
            >
              Go to Login
            </Button>
          </Box>
        </Grid>

        <Snackbar
          open={open}
          autoHideDuration={5000}
          onClose={() => setOpen(false)}
          message={success}
        />
      </Grid>
    );
  }

  return (
    <Grid container component="main" sx={{ height: "100vh" }}>
      {/* LEFT SIDE IMAGE */}
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

      {/* RIGHT FORM */}
      <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6}>
        <Box
          sx={{
            my: 8,
            mx: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Avatar sx={{ bgcolor: "primary.main", mb: 2 }}>
            <LockIcon />
          </Avatar>

          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            Reset Password
          </Typography>

          <Typography sx={{ mt: 1, color: "gray", textAlign: "center" }}>
            Enter your new password below
          </Typography>

          {/* PASSWORD */}
          <Box sx={{ mt: 3, width: "100%" }}>
            <TextField
              fullWidth
              label="New Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              size="small"
              onClick={() => setShowPassword(!showPassword)}
              sx={{ mt: 1 }}
            >
              {showPassword ? "Hide" : "Show"}
            </Button>

            {/* REQUIREMENTS */}
            <Typography sx={{ mt: 2, fontSize: 12, color: "gray" }}>
              Password must contain:
            </Typography>

            <ul style={{ fontSize: "12px", marginTop: 5 }}>
              <li style={{ color: password.length >= 8 ? "green" : "gray" }}>
                At least 8 characters
              </li>
              <li style={{ color: /[A-Z]/.test(password) ? "green" : "gray" }}>
                One uppercase letter
              </li>
              <li style={{ color: /[a-z]/.test(password) ? "green" : "gray" }}>
                One lowercase letter
              </li>
              <li style={{ color: /\d/.test(password) ? "green" : "gray" }}>
                One number
              </li>
            </ul>

            {/* CONFIRM PASSWORD */}
            <TextField
              fullWidth
              sx={{ mt: 2 }}
              label="Confirm Password"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 3 }}
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>

            <Typography align="center" sx={{ mt: 2 }}>
              <Link onClick={() => navigate("/auth")} sx={{ cursor: "pointer" }}>
                Back to Login
              </Link>
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* ERROR SNACKBAR */}
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
        message={error || success}
      />
    </Grid>
  );
}
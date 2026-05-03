
import * as React from 'react';
import { useContext } from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar } from '@mui/material';
import { useNavigate } from "react-router-dom";
import ForgotPassword from './ForgotPassword';    
import server from "../environment";

import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

import GoogleIcon from "@mui/icons-material/Google";


const defaultTheme = createTheme();


export default function Authentication(){

    const navigate = useNavigate();
    const { setUserData } = useContext(AuthContext);

    const [email,setEmail]=React.useState();
    const [password,setPassword]=React.useState();
    const [name,setName] =React.useState();
    const [error,setError]=React.useState();
    const [message,setMessage]=React.useState();

    const [formState,setFormState]=React.useState(0);
    //snackbar
    const [open,setOpen]=React.useState(false);

    const {handleRegister,handleLogin} =React.useContext(AuthContext);

        // add this state
    const [confirmPassword, setConfirmPassword] = React.useState();

    const [agreeTerms, setAgreeTerms] = React.useState(false);
    const [rememberMe, setRememberMe] = React.useState(false);

    // validation functions
    const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const validatePassword = (password) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password);
    };

    const handleAuth = async () => {
    try {
        setError("");

        // 🔒 VALIDATION
        if (!email || !password || (formState === 1 && (!name || !confirmPassword))) {
        return setError("All fields are required");
        }

        if (formState === 1) {
         if (!agreeTerms) {
            return setError("You must agree to Terms of Service");
        }
        if (!validateEmail(email)) {
            return setError("Invalid email format");
        }

        if (!validatePassword(password)) {
            return setError(
            "Password must be 8+ chars with uppercase, lowercase, number & special char"
            );
        }

        if (password !== confirmPassword) {
            return setError("Passwords do not match");
        }
        }

        if (formState === 0) {
        await handleLogin(email, password,rememberMe);
        }

        if (formState === 1) {
        let result = await handleRegister(name, email, password);

        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setName("");
        setMessage(result);
        setOpen(true);
        setFormState(0);
        }

    } catch (err) {
        let message = err.response?.data?.message || "Error occurred";
        setError(message);
    }
    };

    // let isLoggingIn = false;
    const handleGoogleLogin = async () => {

        // if (isLoggingIn) return; // ❗ prevent duplicate popup
        // isLoggingIn = true;

        try {

            googleProvider.setCustomParameters({
            prompt: "select_account"
            });
            const result = await signInWithPopup(auth, googleProvider);

            const user = result.user;

            // console.log("Google User:", user);

            // send to backend
            const response = await fetch(`${server.prod}/api/auth/google-login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: user.displayName,
                email: user.email,
                // photo: user.photoURL,
                // googleId: user.uid,
            }),
            });

            const data = await response.json();

            if (response.ok) {
                const user = {
                    _id: data.user._id,
                    name: data.user.name,
                    email: data.user.email
                };

            // ✅ CLEAR OLD USER (IMPORTANT)
            localStorage.removeItem("user");
            sessionStorage.removeItem("user");

            // ✅ STORE NEW USER
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(user));

            // ✅ UPDATE CONTEXT STATE (VERY IMPORTANT)
            setUserData(user);

            sessionStorage.setItem("user", JSON.stringify(user)); // ✅ ADD
            navigate("/home");
            }

        } catch (error) {
            console.log(error);
        }
        // isLoggingIn = false;
    };

    React.useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
            setError("");
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [error]);

    return (
        <ThemeProvider theme={defaultTheme}>
            <Grid container component="main" sx={{ height: '100vh' }}>
                <CssBaseline />
                <Grid
                    item
                    xs={false}
                    sm={4}
                    md={7}
                    sx={{
                        backgroundImage: 'url("https://img.freepik.com/free-vector/tablet-login-concept-illustration_114360-7963.jpg?semt=ais_hybrid")',
                        backgroundRepeat: 'no-repeat',
                        backgroundColor: (t) =>
                            t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
                    <Box
                        sx={{
                            my: 8,
                            mx: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                    
                    <Typography sx={{ width: "100%", textAlign: "left", mb: 2,textDecorationUnderline: "none" }}>
                            <Link
                                component="button"
                                variant="body2"
                                onClick={() => navigate("/")}
                            >
                                ← Back to Landing
                            </Link>
                    </Typography>
                    
                        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                            <LockOutlinedIcon />
                        </Avatar>


                        <div>
                            <Button variant={formState === 0 ? "contained" : ""} onClick={() => { setFormState(0) }}>
                                Sign In
                            </Button>
                            <Button variant={formState === 1 ? "contained" : ""} onClick={() => { setFormState(1) }}>
                                Sign Up
                            </Button>
                        </div>

                        <Box component="form" noValidate sx={{ mt: 1 }}>

                            {/* Name (Signup only) */}
                            {formState === 1 && (
                                <TextField
                                margin="normal"
                                required
                                fullWidth
                                label="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                />
                            )}

                            {/* Email */}
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                label="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />

                            {/* Password */}
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                type="password"
                                label="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                name="password"
                                autoComplete="new-password"
                            />

                            {/* Confirm Password (Signup only) */}
                            {formState === 1 && (
                                <TextField
                                margin="normal"
                                required
                                fullWidth
                                type="password"
                                label="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            )}

                            {formState === 1 && (
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={agreeTerms}
                                            onChange={(e) => setAgreeTerms(e.target.checked)}
                                        />
                                    }
                                    label="I agree to the Terms of Service and Privacy Policy"
                                />
                            )}
                             {formState === 0 && (
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            mt: 1,
                                        }}
                                    >
                                        {/* Remember Me */}
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={rememberMe}
                                                    onChange={(e) => setRememberMe(e.target.checked)}
                                                />
                                            }
                                            label="Remember me"
                                        />

                                        {/* Forgot Password */}
                                        <Typography>
                                            <Link
                                                component="button"
                                                variant="body2"
                                                onClick={() => navigate("/forgot-password")}
                                            >
                                                Forgot Password?
                                            </Link>
                                        </Typography>
                                    </Box>
                                )}

                            <p style={{ color: "red" }}>{error}</p>
                                <Button
                                    type="button"
                                    fullWidth
                                    variant="contained"
                                    sx={{ mt: 3, mb: 2 }}
                                    onClick={handleAuth}
                                >
                                    {formState === 0 ? "Login" : "Register"}
                                </Button>

                                <Button
  fullWidth
  variant="outlined"
  onClick={handleGoogleLogin}
  sx={{
    mt: 2,
    textTransform: "none",
    fontWeight: 600,
    borderRadius: "10px",
    padding: "11px 0",
    borderColor: "#dadce0",
    color: "#3c4043",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 1.5,
    "&:hover": {
      backgroundColor: "#f8f9fa",
    },
  }}
>
  <img
    src="https://developers.google.com/identity/images/g-logo.png"
    alt="Google"
    style={{ width: 20, height: 20 }}
  />
  Continue with Google
</Button>
                               

                                {/* 🔗 Create Account (LOGIN PAGE) */}
                                {formState === 0 && (
                                    <Typography align="center" sx={{ mt: 2 }}>
                                        Don’t have an account?{" "}
                                        <Link
                                            component="button"
                                            variant="body2"
                                            onClick={() => setFormState(1)}
                                        >
                                            Create Account
                                        </Link>
                                    </Typography>
                                )}

                                {/* 🔗 Back to Login (SIGNUP PAGE) */}
                                {formState === 1 && (
                                    <Typography align="center">
                                        Already have an account?{" "}
                                        <Link
                                            component="button"
                                            variant="body2"
                                            onClick={() => setFormState(0)}
                                        >
                                            Login
                                        </Link>
                                    </Typography>
                                )}
                                                            

                            </Box>
                    </Box>
                </Grid>
            </Grid>

            <Snackbar

                open={open}
                autoHideDuration={3000}
                onClose={() => setOpen(false)}
                message={message}
            />
        </ThemeProvider>
    );
}
import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import withAuth from '../utils/withAuth';
import { IconButton, TextField } from '@mui/material';
//import RestoreIcon from '@mui/icons-material/Restore';
import "../App.css";
import Button from '@mui/material/Button';
import LogoutIcon from '@mui/icons-material/Logout';
import HistoryIcon from '@mui/icons-material/History';
import { addToUserHistory } from '../contexts/AuthContext.jsx';
import { AuthContext } from '../contexts/AuthContext';
import HomeIcon from '@mui/icons-material/Home';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';


function HomeComponent () {

    const navigate =useNavigate();
    let [meetingCode,setMeetingCode]=useState("");

    const {addToUserHistory}=useContext(AuthContext);
    const { user } = useContext(AuthContext);

    let handleJoinVideoCall = async()=>{
        await addToUserHistory(meetingCode);
        navigate(`/${meetingCode}`)
    }
    const [anchorEl, setAnchorEl] = useState(null);

    const open = Boolean(anchorEl);

    const handleMenuOpen = (event) => {
      setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
      setAnchorEl(null);
    };

    const handleLogout = () => {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      handleClose();
      navigate("/auth");
    };

    return ( <>
        <div className='navBar' 
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 0",
            margin: 0,
            width: "100%",
            position: "fixed",   // 👈 stick to top
            top: 0,              // 👈 no gap from top
            left: 0,
            zIndex: 1000,
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
            background: "#fff"
          }}
        >

          {/* LEFT LOGO */}
          <h2 style={{ color: "#ff9839", margin: 0 }}>
            Apna Video Call
          </h2>

          {/* RIGHT SIDE */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>

            {/* HOME */}
            <span 
              style={{ cursor: "pointer", fontWeight: "500" }}
              onClick={() => navigate("/home")}
            >
              Home
            </span>

            {/* HISTORY */}
            <span 
              style={{ cursor: "pointer", fontWeight: "500" }}
              onClick={() => navigate("/history")}
            >
              History
            </span>

            {/* ACCOUNT ICON */}
            <Tooltip title="Account">
              <IconButton onClick={handleMenuOpen}>
                <AccountCircleIcon sx={{ fontSize: 35 }} />
              </IconButton>
            </Tooltip>

            {/* DROPDOWN MENU */}
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
            >
              <MenuItem disabled>
                <div>
                  <strong>{user?.name || "User"}</strong><br/>
                  <span style={{ fontSize: "12px" }}>
                    {user?.email}
                  </span>
                </div>
              </MenuItem>

              <MenuItem onClick={handleLogout}>
                Logout
              </MenuItem>
            </Menu>

          </div>
        </div>
        <div className='meetContainer'style={{ marginTop: "70px" }}>
            <div className='col-6 leftPanel'
              style={{display: "flex",justifyContent: "center",alignItems: "center",gap: "80px"
              }}
            >

              {/* NEW MEETING */}
              <div style={{ textAlign: "center" }}>
                <img
                  src="https://cdn-icons-png.flaticon.com/512/565/565547.png"
                  alt="new meeting"
                  style={{ width: "95px", height: "95px", marginBottom: "20px" }}
                />

                <h2>New Meeting</h2>

                <p style={{ color: "gray", marginBottom: "20px" }}>
                  Start an instant meeting with one click
                </p>

                <Button
                  variant="contained"
                  onClick={() => navigate("/create-meeting")}
                >
                  Start Meeting
                </Button>
              </div>


              {/* JOIN MEETING */}
              <div style={{ textAlign: "center" }}>
                <img
                  src="https://cdn-icons-png.flaticon.com/512/1828/1828817.png"
                  alt="join meeting"
                  style={{ width: "95px", height: "95px", marginBottom: "20px" }}
                />

                <h2>Join Meeting</h2>

                <p style={{ color: "gray", marginBottom: "20px" }}>
                  Enter a meeting code to join
                </p>

                <Button
                  variant="contained"
                  onClick={() => navigate("/join-meeting")}
                >
                  Join Meeting
                </Button>
              </div>

            </div>

            
              <div className=' col-6 rightPanel'>
                <img srcSet='/calling.png' alt=''style={{height:'80%'}}></img>
              </div>

           

        </div>
      

    </> );
}

export default withAuth(HomeComponent);
import React from 'react';
import "../App.css";
import { Link, useNavigate } from "react-router-dom";



export default function LandingPage() {

    const router=useNavigate();
    return (  
        <div className='LandingPageContainer'>
            <nav>
                <div className='navHeader'>
                    <h2>Apna Video Call</h2>
                </div>
                <div className='navList'>
                   
                    <div role='button'>
                        <p><Link to={"/auth"} style={{textDecoration:"none",color:"white"}}>Register</Link></p>
                    </div>
                    <div role='button'>
                        <p><Link to={"/auth"} style={{textDecoration:"none",color:"white"}}>Login</Link></p>
                    </div>
                </div>
            </nav>

            <div className='LandingMainContainer'>
                <div>
                    <h1><span style={{color:"#ff9839"}}>Connect </span>with your<br></br> Loved Ones</h1>
                    <p>Cover a distance by apna video call</p>
                    <div role='button' >
                        <Link to={"/auth"} style={{textDecoration:"none",color:"white"}}>Get Started</Link>
                    </div>
                
                </div>
                <div>
                    <img src="mobile.png" alt=''></img>
                </div>
            </div>

        </div>
    );
}

 
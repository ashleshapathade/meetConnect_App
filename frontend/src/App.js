
import './App.css';
import {Routes,BrowserRouter as Router,Route} from "react-router-dom";
import LandingPage from './pages/landing';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import VideoMeetComponent from './pages/VideoMeet';
import HomeComponent from './pages/home';
import History from './pages/history';
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CreateMeeting from "./pages/CreateMeeting";
import JoinMeeting from "./pages/JoinMeeting";
import Lobby from "./pages/Lobby";


function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage/>}></Route>
          <Route path="/auth" element={<Authentication/>}></Route>
          <Route path='/home' element={<HomeComponent/>}></Route>
          <Route path='/history' element={<History/>}></Route>
          <Route path='/meeting/:id' element={<VideoMeetComponent/>}></Route>
          

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />


        <Route path="/create-meeting" element={<CreateMeeting />} />
        <Route path="/join-meeting" element={<JoinMeeting />} />
        <Route path="/lobby/:id" element={<Lobby />} />
        

        </Routes>
      </AuthProvider>
    </Router>

    
  );
}

export default App;

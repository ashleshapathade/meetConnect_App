import {
  Children,
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import axios from "axios";
import { Navigate, useNavigate } from "react-router-dom";
import httpStatus from "http-status";
//import { Meeting } from "../backend/src/models/meeting.model";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
  baseURL: `${server.prod}/api/v1/users`,
});

export const AuthProvider = ({ children }) => {
  const router = useNavigate();

  const authContext = useContext(AuthContext);

  const [userData, setUserData] = useState(null);

  const handleRegister = async (name, email, password) => {
    try {
      let request = await client.post("/register", {
        name: name,
        email: email,
        password: password,
      });
      if (request.status === httpStatus.CREATED) {
        return request.data.message;
      }
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    const storedUser =
      JSON.parse(localStorage.getItem("user")) ||
      JSON.parse(sessionStorage.getItem("user"));

    if (storedUser && storedUser._id && storedUser.name && storedUser.email) {
      setUserData(storedUser);
    }
  }, []);

  const handleLogin = async (email, password, rememberMe) => {
    try {
      let request = await client.post("/login", {
        email,
        password,
      });

      const user = {
        _id: request.data.user._id, // ✅ MUST include this
        name: request.data.user.name,
        email: request.data.user.email,
      };

      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");

      console.log("LOGIN RESPONSE:", user);
      if (request.status === httpStatus.OK) {
        if (rememberMe) {
          localStorage.setItem("token", request.data.token);
          localStorage.setItem("user", JSON.stringify(user));
        } else {
          sessionStorage.setItem("token", request.data.token);
          sessionStorage.setItem("user", JSON.stringify(user));
        }

        // ✅ SET USER IN STATE
        setUserData(user);
        router("/home");
      }
    } catch (err) {
      throw err;
    }
  };

  const getHistoryOfUser = async () => {
    try {
      let request = await client.get("/get_all_activity", {
        params: {
          token: localStorage.getItem("token"),
        },
      });
      return request.data;
    } catch (err) {
      throw err;
    }
  };

  const addToUserHistory = async (meetingCode) => {
    try {
      let request = await client.post("/add_to_activity", {
        token: localStorage.getItem("token"),
        meeting_code: meetingCode,
      });
      return request.data;
    } catch (err) {
      throw err;
    }
  };

  const data = {
    user: userData,
    setUserData,
    handleRegister,
    handleLogin,
    getHistoryOfUser,
    addToUserHistory,
  };

  return <AuthContext.Provider value={data}>{children}</AuthContext.Provider>;
};

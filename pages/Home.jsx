import React, { useContext, useRef, useEffect, useState } from "react";
import { userDataContext } from "../src/context/UserContext";
import { useNavigate } from "react-router-dom";
import aiImg from "../src/assets/ai.gif";
import userImg from "../src/assets/voice.gif";
import { TbMenuDeep } from "react-icons/tb";
import { RxCross1 } from "react-icons/rx";

function Home() {
  const { userData, serverUrl, setUserData, getGeminiResponse } =
    useContext(userDataContext);
  const navigate = useNavigate();

  const [listening, setListening] = useState(false);
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [ham, setHam] = useState(false);

  const isSpeakingRef = useRef(false);
  const recognitionRef = useRef(null);
  const isRecognizingRef = useRef(false);

  const synth = window.speechSynthesis;

  // 🚪 Logout
  const handleLogOut = async () => {
    setUserData(null);
    navigate("/signin");
  };

  // 🗣️ Speak
  const speak = (text) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);// browser ka builtin object hai batata hai ki kya bolna hai aur kaise bolna hai usko 

    const voices = synth.getVoices();
    const voice =
      voices.find((v) => v.lang === "hi-IN") ||
      voices.find((v) => v.lang.startsWith("en")) ||
      voices[0];
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || "en-IN";

    isSpeakingRef.current = true;
    utterance.onend = () => {
      isSpeakingRef.current = false;
      setAiText(""); // clear after speaking
      setTimeout(() => startRecognition(), 800);
    };

    synth.cancel();
    synth.speak(utterance);
  };

  // 🎤 Start Recognition
  const startRecognition = () => {
    const rec = recognitionRef.current;
    if (!rec || isRecognizingRef.current || isSpeakingRef.current) return;
    try {
      rec.start();
      console.log("🎙️ Recognition started");
    } catch (err) {
      if (err.name !== "InvalidStateError") console.error(err);
    }
  };

  // ⚡ Handle Commands
  const handleCommand = (parsed) => {
    if (!parsed) return;
    const { type, userInput, response } = parsed;

    speak(response);
    setAiText(response);

    let url = "";
    switch (type) {
      case "google-search":
        url = `https://www.google.com/search?q=${encodeURIComponent(userInput)}`;
        break;
      case "youtube-search":
      case "youtube-play":
        url = `https://www.youtube.com/results?search_query=${encodeURIComponent(
          userInput
        )}`;
        break;
      case "calculator-open":
        url = `https://www.google.com/search?q=calculator`;
        break;
      case "instagram-open":
        url = `https://www.instagram.com/`;
        break;
      case "facebook-open":
        url = `https://www.facebook.com/`;
        break;
      case "weather-show":
        url = `https://www.google.com/search?q=weather`;
        break;
      case "get-time":
        speak(`Abhi ${new Date().toLocaleTimeString()} ho raha hai.`);
        break;
      case "get-date":
        speak(`Aaj ${new Date().toLocaleDateString()} hai.`);
        break;
      case "get-day":
        speak(
          `Aaj ${new Date().toLocaleDateString("en-IN", {
            weekday: "long",
          })} hai.`
        );
        break;
      default:
        break;
    }
    if (url) {
      console.log("Opening URL:", url);
      window.open(url, "_blank");
    }
  };

  // 🎤 Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser!");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      setListening(true);
      console.log("🎧 Listening...");
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      setListening(false);
      if (!isSpeakingRef.current) setTimeout(startRecognition, 1000);
    };

    recognition.onerror = (e) => {
      console.warn("Recognition error:", e.error);
      isRecognizingRef.current = false;
      setListening(false);
      if (e.error !== "aborted") setTimeout(startRecognition, 1500);
    };

    recognition.onresult = async (event) => {
      const transcript =
        event.results[event.results.length - 1][0].transcript.trim();
      console.log("Heard:", transcript);

      if (transcript) {
        recognition.stop();
        isRecognizingRef.current = false;
        setListening(false);
        setUserText(transcript);

        try {
          const data = await getGeminiResponse(
            transcript,
            userData.assistantName || "Jarvis",
            userData.name || "User"
          );

          let parsed;
          try {
            parsed =
              typeof data === "string" ? JSON.parse(data.trim()) : data;
          } catch {
            speak("Sorry, mujhe samajh nahi aaya.");
            return;
          }

          setAiText(parsed.response);
          handleCommand(parsed);
          setUserText("");
        } catch (err) {
          console.error("Gemini error:", err);
          speak("Sorry, kuchh galat ho gaya.");
        }
      }
    };

    // Greeting
    const greet = new SpeechSynthesisUtterance(
      `Hello ${userData?.name || "User"}, main ${
        userData?.assistantName || "Jarvis"
      } hoon. How can I help you?`
    );
    greet.lang = "en-IN";
    synth.speak(greet);

    setTimeout(startRecognition, 1200);

    return () => {
      recognition.stop();
      synth.cancel();
    };
  }, []);

  return (
    <div className="w-full h-[100vh] bg-gradient-to-t from-black to-[#02023d] flex justify-center items-center flex-col gap-[15px] overflow-hidden">
      {/* Mobile Menu */}
      <TbMenuDeep
        className="lg:hidden text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]"
        onClick={() => setHam(true)}
      />
      <div
        className={`absolute lg:hidden top-0 w-full h-full bg-[#00000053] backdrop-blur-lg p-[20px] flex flex-col gap-[20px] items-start ${
          ham ? "translate-x-0" : "translate-x-full"
        } transition-transform`}
      >
        <RxCross1
          className=" text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]"
          onClick={() => setHam(false)}
        />
        <button
          className="min-w-[150px] h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px]"
          onClick={handleLogOut}
        >
          Log Out
        </button>
        <button
          className="min-w-[150px] h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px] px-[20px] py-[10px]"
          onClick={() => navigate("/customize")}
        >
          Customize your Assistant
        </button>
        <div className="w-full h-[2px] bg-gray-400"></div>
        <h1 className="text-white font-semibold text-[19px]">History</h1>
        <div className="w-full h-[400px] gap-[20px] overflow-y-auto flex flex-col truncate">
          {userData.history?.map((his, idx) => (
            <div
              key={idx}
              className="text-gray-200 text-[18px] w-full h-[30px]"
            >
              {his}
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Buttons */}
      <button
        className="min-w-[150px] h-[60px] mt-[30px] text-black font-semibold absolute hidden lg:block top-[20px] right-[20px] bg-white rounded-full cursor-pointer text-[19px]"
        onClick={handleLogOut}
      >
        Log Out
      </button>
      <button
        className="min-w-[150px] h-[60px] mt-[30px] text-black font-semibold bg-white absolute top-[100px] right-[20px] rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] hidden lg:block"
        onClick={() => navigate("/customize")}
      >
        Customize your Assistant
      </button>

      {/* Assistant Image */}
      <div className="w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg">
        <img
          src={userData?.assistantImage}
          alt=""
          className="h-full object-cover"
        />
      </div>

      <h1 className="text-white text-[18px] font-semibold">
        I'm {userData?.assistantName || "Jarvis"}
      </h1>

      {!aiText && <img src={userImg} alt="" className="w-[200px]" />}
      {aiText && <img src={aiImg} alt="" className="w-[200px]" />}

      <h1 className="text-white text-[18px] font-semibold text-wrap">
        {userText || aiText || null}
      </h1>
    </div>
  );
}

export default Home;

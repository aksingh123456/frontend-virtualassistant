import React, { useContext, useEffect, useRef, useState } from "react";
import { userDataContext } from "../src/context/UserContext";
import { useNavigate } from "react-router-dom";
import aiImg from "../src/assets/AI.gif";
import userImg from "../src/assets/voice.gif";
import { TbMenuDeep } from "react-icons/tb";
import { RxCross1 } from "react-icons/rx";
import { FaMicrophone } from "react-icons/fa";

function Home() {
  const { userData, setUserData, getGeminiResponse } = useContext(userDataContext);
  const navigate = useNavigate();

  const [listening, setListening] = useState(false);
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [ham, setHam] = useState(false);

  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const shouldListenRef = useRef(true);

  const synth = window.speechSynthesis;

  //  Logout
  const handleLogOut = () => {
    setUserData(null);
    navigate("/signin");
  };

  //  Add to history
  const addToHistory = (text) => {
    setUserData((prev) => ({
      ...prev,
      history: [...(prev.history || []), text],
    }));
  };

  //  Speak Hindi/English properly
  const speak = (text) => {
    if (!text) return;
    synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const isHindi = /^[\u0900-\u097F\s.,!?]+$/.test(text);

    if (isHindi) {
      utter.voice = voices.find((v) => v.lang === "hi-IN") || voices[0];
      utter.lang = "hi-IN";
    } else {
      utter.voice = voices.find((v) => v.lang.startsWith("en")) || voices[0];
      utter.lang = "en-IN";
    }

    utter.rate = 0.95;
    utter.pitch = 1;
    isSpeakingRef.current = true;

    utter.onend = () => {
      isSpeakingRef.current = false;
      setAiText("");
      if (shouldListenRef.current) setTimeout(startRecognition, 700);
    };

    synth.speak(utter);
  };

  // 🔹 Start recognition
  const startRecognition = () => {
    const rec = recognitionRef.current;
    if (!rec || isSpeakingRef.current || listening) return;
    try {
      rec.start();
    } catch {}
  };

  // 🔹 Manual mic start
  const handleStartMic = () => {
    shouldListenRef.current = true;
    startRecognition();
  };

  // 🔹 Handle AI command & open URL
  const handleCommand = (parsed) => {
    if (!parsed) return;
    const { type, userInput, response } = parsed;

    addToHistory("🧑 " + userInput);
    addToHistory("🤖 " + response);

    setAiText(response);
    speak(response);

    let url = "";
    switch (type) {
      case "youtube-search":
      case "youtube-play":
        url = `https://www.youtube.com/results?search_query=${encodeURIComponent(userInput)}`;
        break;
      case "google-search":
        url = `https://www.google.com/search?q=${encodeURIComponent(userInput)}`;
        break;
      case "stop":
        shouldListenRef.current = false;
        speak("ठीक है, मैं रुक रहा हूँ।");
        return;
      default:
        break;
    }
    if (url) window.open(url, "_blank");
  };

  // 🔹 Setup recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported!");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-IN";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      if (shouldListenRef.current && !isSpeakingRef.current) setTimeout(startRecognition, 700);
    };
    recognition.onerror = () => setListening(false);

    recognition.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      if (!transcript) return;

      recognition.stop();
      setUserText(transcript);

      try {
        const data = await getGeminiResponse(
          transcript,
          userData.assistantName || "Jarvis",
          userData.name || "User"
        );

        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        handleCommand(parsed);
        setUserText("");
      } catch {
        speak("माफ़ करना, कुछ गड़बड़ हो गई।");
      }
    };

    recognitionRef.current = recognition;

    // Greeting
    setTimeout(() => speak(`Hello ${userData?.name || "User"}, main ${userData?.assistantName || "Jarvis"} hoon.`), 500);

    setTimeout(startRecognition, 1200);

    return () => {
      recognition.stop();
      synth.cancel();
    };
  }, []);

  return (
    <div
      className="w-full h-[100vh] flex flex-col items-center justify-center gap-4 relative"
      style={{
        backgroundImage: `url(${userData?.assistantImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Top Buttons */}
      <div className="absolute top-5 right-5 flex gap-3">
        <button
          onClick={handleStartMic}
          className="bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-green-600"
        >
          <FaMicrophone /> Start Mic
        </button>

        <button
          onClick={() => navigate("/customize")}
          className="bg-white px-4 py-2 rounded-full hover:bg-gray-200"
        >
          Customize
        </button>

        <TbMenuDeep
          className="text-white w-7 h-7 cursor-pointer"
          onClick={() => setHam(true)}
        />
      </div>

      {/* Side Menu */}
      {ham && (
        <div className="absolute inset-0 bg-black/70 p-5">
          <RxCross1
            className="text-white absolute top-5 right-5 cursor-pointer"
            onClick={() => setHam(false)}
          />
          <button onClick={handleLogOut} className="bg-white px-5 py-2 rounded-full">Logout</button>
          <h2 className="text-white mt-5 mb-2">History</h2>
          <div className="text-white h-[70vh] overflow-y-auto">
            {userData.history?.map((h, i) => <div key={i}>{h}</div>)}
          </div>
        </div>
      )}

      {!aiText && <img src={userImg} className="w-48" />}
      {aiText && <img src={aiImg} className="w-48" />}
      <h1 className="text-white text-lg text-center px-4">{userText || aiText}</h1>
      {listening && <p className="text-green-400 font-semibold">🎧 Listening...</p>}
    </div>
  );
}

export default Home;

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getAICompanionChatResponse, isGeminiConfigured, missingApiKeyError } from '../../services/geminiService';
import { useAppContext } from '../../context/AppContext';
import MicrophoneIcon from '../icons/MicrophoneIcon';


// fix: Add types for browser-specific Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Reference to the global faceapi object from the script tag
declare const faceapi: any;

interface AICompanionProps {
  onBack: () => void;
}

interface Message {
  text: string;
  sender: 'user' | 'ai';
}

const AICompanion: React.FC<AICompanionProps> = ({ onBack }) => {
  const { dispatch } = useAppContext();
  const [messages, setMessages] = useState<Message[]>(() => [
    { sender: 'ai', text: isGeminiConfigured ? "Hello! I'm Digi, your friendly companion. How are you feeling today?" : missingApiKeyError }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sendTranscriptOnEnd, setSendTranscriptOnEnd] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Emotion Detection State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [lastDetectedEmotion, setLastDetectedEmotion] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  

  const handleSend = useCallback(async () => {
    if (input.trim() === '' || isLoading) return;
    const userMessage: Message = { text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    const textToSend = input;
    setInput('');
    setIsLoading(true);
    const aiResponseText = await getAICompanionChatResponse(textToSend);
    const aiMessage: Message = { text: aiResponseText, sender: 'ai' };
    setMessages(prev => [...prev, aiMessage]);
    setIsLoading(false);
  }, [input, isLoading]);

  // This effect triggers sending the message when speech recognition ends.
  useEffect(() => {
    if (sendTranscriptOnEnd) {
      if (input.trim() !== '') {
        handleSend();
      }
      setSendTranscriptOnEnd(false); // Reset the trigger
    }
  }, [sendTranscriptOnEnd, input, handleSend]);

  // Load face-api models, set up camera, and speech recognition
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
      } catch (error) { console.error("Failed to load face-api models", error); }
    };
    if (typeof faceapi !== 'undefined') loadModels();
    
    const startVideo = () => {
        navigator.mediaDevices.getUserMedia({ video: {} })
            .then(stream => { 
              if (videoRef.current) videoRef.current.srcObject = stream;
              setCameraError(null);
            })
            .catch(err => {
                console.error("Error starting video stream:", err);
                 if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    setCameraError("Camera access denied. Emotion detection is disabled. Please allow access in browser settings.");
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                     setCameraError("No camera found on this device. Emotion detection is unavailable.");
                } else {
                    setCameraError("Could not start camera. Emotion detection is unavailable.");
                }
            });
    };
    startVideo();

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => {
          setIsListening(false);
          setSendTranscriptOnEnd(true); // Trigger sending the message
        };
        recognition.onresult = (event: any) => setInput(event.results[event.results.length - 1][0].transcript);
        recognition.onerror = (event: any) => { console.error("Speech recognition error:", event.error); setIsListening(false); };
        recognitionRef.current = recognition;
    }

    return () => {
        if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
        if (videoRef.current && videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }
        if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // Start emotion detection when models and video are ready
  useEffect(() => {
    if (modelsLoaded && videoRef.current) {
        detectionIntervalRef.current = setInterval(async () => {
            if (videoRef.current && !videoRef.current.paused) {
                const detections = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
                if (detections && detections.expressions) {
                    const expressions = detections.expressions;
                    const dominantEmotion = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
                    if (dominantEmotion !== lastDetectedEmotion) {
                        setLastDetectedEmotion(dominantEmotion);
                        dispatch({ type: 'LOG_EMOTION', payload: { emotion: dominantEmotion } });
                    }
                }
            }
        }, 5000); // Detect every 5 seconds
    }
  }, [modelsLoaded, dispatch, lastDetectedEmotion]);

  const handleListen = () => {
      if (!recognitionRef.current) return alert("Sorry, your browser doesn't support voice recognition.");
      if (isListening) recognitionRef.current.stop();
      else { setInput(''); recognitionRef.current.start(); }
  };

  return (
    <div className="relative p-4 sm:p-6 bg-slate-900/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl h-[95vh] flex flex-col">
       <video ref={videoRef} autoPlay muted playsInline style={{ display: 'none' }} width="320" height="240"></video>
       <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-slate-700"></div>
       <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-slate-700"></div>
      
      <header className="flex items-center justify-between pb-4 border-b border-slate-700/50">
        <div className="flex items-center">
            <button onClick={onBack} className="text-slate-400 text-sm p-2 rounded-full hover:bg-slate-800/50 transition-colors mr-2 flex items-center gap-1">
                <span className='text-lg'>&larr;</span> Back
            </button>
            <div className="text-2xl mr-3">❤️</div>
            <div>
                <h2 className="text-xl font-bold text-white">Your Companion, Digi</h2>
                <p className={`text-sm font-semibold ${isGeminiConfigured ? 'text-green-400' : 'text-yellow-400'}`}>
                    {isGeminiConfigured ? 'Online' : 'Limited'}
                </p>
            </div>
        </div>
        <div className="flex items-center gap-4">
             {cameraError ? (
                <div className="text-right text-xs text-yellow-400 max-w-xs">{cameraError}</div>
             ) : (
                lastDetectedEmotion && (
                    <div className="text-right text-xs">
                        <p className="text-slate-400">Feeling:</p>
                        <p className="font-semibold text-white capitalize">{lastDetectedEmotion}</p>
                    </div>
                )
             )}
        </div>
      </header>
      
      <div className="flex-grow my-2 overflow-y-auto pr-2">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl shadow-md ${
                  msg.sender === 'user' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-gray-300'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex justify-start">
                <div className="bg-slate-800 rounded-xl p-3 shadow-md">
                    <div className="flex items-center space-x-1">
                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
                    </div>
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="mt-auto flex items-center border-t border-slate-700/50 pt-4 gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isListening ? 'Listening...' : "Type a message..."}
          className="flex-grow px-4 py-3 bg-slate-800/70 border border-slate-700 rounded-full text-white placeholder-slate-400 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-colors disabled:bg-slate-800/40 disabled:cursor-not-allowed"
          disabled={isLoading || isListening || !isGeminiConfigured}
        />
        {recognitionRef.current && (
            <button
              onClick={handleListen}
              disabled={isLoading || !isGeminiConfigured}
              className={`flex-shrink-0 w-12 h-12 rounded-full transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                  isListening 
                  ? 'bg-red-600 text-white animate-pulse focus:ring-red-500' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 focus:ring-slate-500'
              } disabled:bg-slate-800/40 disabled:cursor-not-allowed`}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
            >
              <MicrophoneIcon className="w-6 h-6" />
            </button>
        )}
        <button
          onClick={handleSend}
          disabled={isLoading || input.trim() === '' || !isGeminiConfigured}
          className="flex-shrink-0 w-12 h-12 bg-slate-700 text-white font-bold rounded-full disabled:bg-slate-800/40 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors flex items-center justify-center"
          aria-label="Send message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
        </button>
      </div>
    </div>
  );
};

export default AICompanion;
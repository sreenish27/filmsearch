'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, px } from 'framer-motion'
import { Search, X, Loader } from 'lucide-react'
import Image from 'next/image'
import random from 'random';
import axios from 'axios';
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"


const placeholders = [
  "Most visually stunning sci-fi films of the 21st century with groundbreaking special effects",
  "Movies with non-linear narratives that challenge perception of time and reality",
  "Surrealist films that blur the line between reality and dreams, leaving audiences perplexed",
  "Psychological thrillers with unreliable narrators and mind-bending plot twists",
  "Interconnected storylines across multiple timelines or dimensions, creating a complex narrative",
  "Philosophical films exploring the nature of consciousness and the human experience",
  "Experimental cinema pushing the boundaries of visual storytelling and narrative structure",
  "Movies that seamlessly blend multiple genres in unexpected and innovative ways",
  "Films with ambiguous endings that leave audiences debating interpretations for years",
  "Visually striking arthouse films with complex symbolic imagery and metaphors",
  "Mind-bending movies that require multiple viewings to fully grasp their intricate plots",
  "Films exploring parallel universes or alternate realities, challenging our perception of existence"
]

const filmTranslations = [
  { language: 'English', word: 'Film' },
  { language: 'Mandarin Chinese', word: '电影' },
  { language: 'Hindi', word: 'फ़िल्म' },
  { language: 'Spanish', word: 'Película' },
  { language: 'French', word: 'Film' },
  { language: 'Modern Standard Arabic', word: 'فيلم' },
  { language: 'Bengali', word: 'চলচ্চিত্র' },
  { language: 'Russian', word: 'Фильм' },
  { language: 'Portuguese', word: 'Filme' },
  { language: 'Japanese', word: '映画' },
  { language: 'Marathi', word: 'चित्रपट' },
  { language: 'Telugu', word: 'సినిమా' },
  { language: 'Tamil', word: 'படம்' },
  { language: 'Gujarati', word: 'ફિલ્મ' },
  { language: 'Urdu', word: 'فلم' },
  { language: 'Kannada', word: 'ಚಲನಚಿತ್ರ' },
  { language: 'Odia', word: 'ଚଳଚ୍ଚିତ୍ର' },
  { language: 'Malayalam', word: 'സിനിമ' },
  { language: 'Finnish', word: 'Elokuva' }
]

const filmLines = [
  "Your keyboard isn't just for show. Type something already!",
  "Plot twist: You actually have to type to get results!",
  "Breaking news: Staring at the screen won't magically produce answers!",
  "Spoiler alert: This search bar works best when you use it!",
  "In a world where typing exists... be the hero we need!",
  "The suspense is killing me! Will you type or won't you?",
  "Cut! This scene requires you to actually input a query!",
  "Don't leave me hanging like a cliffhanger. Type something!",
  "Your fingers won't catch fire if you start typing, promise!",
  "And the award for 'Most Reluctant Typer' goes to... not you, right?"
];

const Director = "Directed by"

const mockSearchResults = [
  { id: 1, title: "Das Boot", year: 1981, director: "Wolfgang Petersen", language: "German", image: "/placeholder.svg?height=450&width=300" },
  { id: 2, title: "All Quiet on the Western Front", year: 2022, director: "Edward Berger", language: "German", image: "/placeholder.svg?height=450&width=300" },
  { id: 3, title: "The Bridge", year: 1959, director: "Bernhard Wicki", language: "German", image: "/placeholder.svg?height=450&width=300" },
  { id: 4, title: "Stalingrad", year: 1993, director: "Joseph Vilsmaier", language: "German", image: "/placeholder.svg?height=450&width=300" },
  { id: 5, title: "Downfall", year: 2004, director: "Oliver Hirschbiegel", language: "German", image: "/placeholder.svg?height=450&width=300" },
]

const loadingMessages = [
  { message: "Understanding your inner thoughts...", icon: <Search className="w-8 h-8" /> },
  { message: "Cooking a search...", icon: <span className="w-8 h-8">🍳</span> },
  { message: "Unearthing gems for you...", icon: <span className="w-8 h-8">💎</span> }
];


const getRandomFilmLine = () => {
  return random.choice(filmLines);
};

export default function FilmSearch() {
  const [query, setQuery] = useState('')
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [typedPlaceholder, setTypedPlaceholder] = useState('')
  const [searchResults, setSearchResults] = useState()
  const [isSearched, setIsSearched] = useState(false)
  const [warning, setWarning] = useState('')
  const [filmWordIndex, setFilmWordIndex] = useState(0)
  const textareaRef = useRef(null)
  const [selectedFilm, setSelectedFilm] = useState(null) // nullable film type
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState()
  const [isLoading, setIsLoading] = useState(false);  // Tracks if the search is loading
  const [loadingStep, setLoadingStep] = useState(0);  // Cycles through loading messages
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // Start with 50% width for the left panel
  const [isChatLoading, setIsChatLoading] = useState(false);  // New loading state for chat


  useEffect(() => {
    let currentIndex = 0
    const currentPlaceholder = placeholders[placeholderIndex]
    
    const interval = setInterval(() => {
      if (currentIndex <= currentPlaceholder.length) {
        setTypedPlaceholder(currentPlaceholder.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(interval)
        setTimeout(() => {
          setTypedPlaceholder('')
          setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
        }, 2000)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [placeholderIndex])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [query])

  useEffect(() => {
    if (isLoading) {
      // Define the sequence of durations for each loading step
      const timings = [2000, 2000, 2000]; // 2 seconds, 2 seconds, 2 seconds
      let currentStep = 0;
  
      // Function to cycle through loading steps based on defined timings
      const cycleSteps = () => {
        setLoadingStep(currentStep);
        currentStep = (currentStep + 1) % loadingMessages.length;
        
        if (currentStep < timings.length) {
          setTimeout(cycleSteps, timings[currentStep]);
        }
      };
  
      cycleSteps(); // Start cycling
  
      return () => clearTimeout(); // Cleanup timeout if component unmounts
    }
  }, [isLoading]);
  
  

  useEffect(() => {
    if (!isSearched) {
      const interval = setInterval(() => {
        setFilmWordIndex((prev) => (prev + 1) % filmTranslations.length)
      }, 2000);
      return () => clearInterval(interval);
    } else {
      // When a search is performed, revert back to 'Film' in English
      setFilmWordIndex(0); // Set to the English word "Film"
    }
  }, [isSearched]);
  

  const handleSearch = async (e) => {
    e.preventDefault();
    if (query.trim() === '') {
      setWarning(getRandomFilmLine());
      return;
    }
    
    setWarning('');
    setIsLoading(true);  // Set loading state to true
    
    try {
      const response = await axios.post(process.env.NEXT_PUBLIC_USERQUERY_API, { query: query }, {timeout: 300000});
      console.log(response.data)
      const filmlist = response.data;
      setSearchResults(filmlist);
      console.log(filmlist)
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);  // Stop loading when results are fetched
      setIsSearched(true);
    }
  };

  const handleDrag = (e) => {
    const initialX = e.clientX;
    const containerWidth = document.querySelector('.max-w-6xl').offsetWidth;
  
    const moveHandler = (moveEvent) => {
      const newX = moveEvent.clientX;
      const newWidth = ((newX / containerWidth) * 100); // Convert to percentage
      setLeftPanelWidth(newWidth);  // Update the left panel width dynamically
    };
  
    document.addEventListener('mousemove', moveHandler);
  
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', moveHandler);
    });
  };
  
  

  const handleFilmClick = (film) => {
    setSelectedFilm(film);
    setChatHistory([]);
  };

  const handleCloseFilm = () => {
    setSelectedFilm(null);
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    
    if (chatMessage.trim() === '') return; // If the message is empty, don't do anything
  
    // Create the user message
    const newMessage = { sender: 'user', text: chatMessage };
  
    // Add the user message to the chat history first
    setChatHistory((prev) => [...prev, newMessage]);
  
    // Temporarily store the message before clearing it from the input field
    const tempMessage = chatMessage;
  
    // Clear the input after submitting
    setChatMessage('');

    // Set loading state to true when the request is sent
    setIsChatLoading(true);
  
    try {
      // Call the API with the user's question
      const response = await axios.post(process.env.NEXT_PUBLIC_ANSWERQUERY_API, {
        question: tempMessage, // Use the temporarily stored question
        filmdetails: selectedFilm.b_details,
        filmdata: selectedFilm.o_details
      });
  
      // Add the film's response to the chat history
      const filmResponse = { sender: 'film', text: response.data };
      setChatHistory((prev) => [...prev, filmResponse]);
  
      // Scroll to the bottom of the chat after receiving the answer
      scrollToBottom();
  
    } catch (error) {
      console.error(error);
      const errorResponse = { sender: 'film', text: 'Sorry, something went wrong. Please try again later.' };
      setChatHistory((prev) => [...prev, errorResponse]);
    } finally {
      // Set loading state to false after the request completes
      setIsChatLoading(false);

      // Ensure scrolling to the bottom of the chat
      scrollToBottom();
    }
  };
    
  // Function to scroll to the bottom of the chat history
  const scrollToBottom = () => {
    const chatContainer = document.getElementById('chat-history');
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
};

  
  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-gray-900 flex flex-col items-center p-4">
    <Analytics/>
    <SpeedInsights/>
      {isLoading && (
  <motion.div
    className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.5 }}
  >
    <div className="bg-white bg-opacity-20 backdrop-blur-md w-80 h-40 p-8 rounded-lg shadow-lg flex flex-col items-center justify-center space-y-4">
      <motion.div
        className="text-white text-4xl"
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          repeatType: "loop",
          duration: 2,
          ease: "linear",
        }}
      >
        {loadingMessages[loadingStep].icon} {/* Animated icon */}
      </motion.div>
      <p className="text-white text-xl text-center">{loadingMessages[loadingStep].message}</p>
    </div>
  </motion.div>
)}


      <motion.div
        className={`w-full max-w-6xl ${isSearched ? 'mt-8' : 'mt-32'}`}
        animate={{
          scale: isSearched ? 0.9 : 1,
          y: isSearched ? -50 : 0,
        }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1
          className="text-5xl font-bold text-white-600 mb-8 text-center"
          animate={{
            fontSize: isSearched ? '3rem' : '3rem',
            marginBottom: isSearched ? '1rem' : '2rem',
          }}
          transition={{ duration: 0.5 }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={filmTranslations[filmWordIndex].word}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {filmTranslations[filmWordIndex].word}
            </motion.span>
          </AnimatePresence>
          {' '}Search
        </motion.h1>
        <motion.form
          onSubmit={handleSearch}
          className="relative w-4/5 mx-auto"
          animate={{
            scale: isSearched ? 0.95 : 1,
          }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative flex items-start">
            <textarea
              ref={textareaRef}
              className="w-full bg-white bg-opacity-10 text-white text-xl rounded-2xl py-6 pl-8 pr-20 focus:outline-none focus:ring-2 focus:ring-white focus:bg-opacity-20 transition-all duration-300 resize-none overflow-hidden"
              style={{ height: '180px' }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={typedPlaceholder}
            />
            <motion.button
              className="absolute right-3 top-3 bg-white text-black rounded-xl p-4 focus:outline-none hover:bg-slate-300 transition-colors duration-300"
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Search className="w-8 h-8" />
            </motion.button>
          </div>
        </motion.form>
        {warning && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-orange-400 mt-2 text-center"
          >
            {warning}
          </motion.p>
        )}
        {isLoading && (
        <motion.div
          className="flex flex-col items-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          >
        <div className="flex items-center space-x-2 text-white">
      {loadingMessages[loadingStep].icon}
      <p className="text-xl">{loadingMessages[loadingStep].message}</p>
    </div>
  </motion.div>
)}
      </motion.div>
      <AnimatePresence>
  {!isLoading && isSearched && !selectedFilm && (
    <motion.div
      className="w-full max-w-6xl mt-8"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {searchResults.map((film) => (
          <motion.div
            key={film.id}
            className="bg-white bg-opacity-10 rounded-lg overflow-hidden shadow-lg cursor-pointer transition-transform duration-300 hover:scale-105"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            onClick={() => handleFilmClick(film)}
          >
            <div className="relative aspect-[2/3] w-full">
            <Image
              src={film.image && film.image !== "noimage" ? film.image : "/film.jpg"}
              alt={film.title}
              layout="fill"
              objectFit="cover"
            />
            </div>
            <div className="p-4">
              <h3 className="text-xl font-semibold text-white mb-2">{film.title}</h3>
              <p className="text-gray-300 text-sm mb-1">Language: {film.b_details.Language}</p>
              <p className="text-gray-300 text-sm mb-1">Director: {film.b_details["Directed by"]}</p>
              <p className="text-gray-300 text-sm mb-1">Country: {film.b_details.Country}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )}
</AnimatePresence>


<AnimatePresence>
  {selectedFilm && (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Book-opening effect */}
      <motion.div
        className="bg-white bg-opacity-10 rounded-lg overflow-hidden shadow-lg w-11/12 max-w-6xl h-5/6 flex"
        initial={{ opacity: 0, rotateY: 90, scaleX: 0.8 }} // Add rotation for the book-opening effect
        animate={{ opacity: 1, rotateY: 0, scaleX: 1 }} // Smoothly rotate and scale
        exit={{ opacity: 0, rotateY: 90, scaleX: 0.8 }} // Reverse animation on exit
        transition={{ 
          duration: 1, // Make the animation slightly slower
          ease: [0.43, 0.13, 0.23, 0.96] // More natural ease curve for smooth open
        }}
      >
        {/* Left Panel for Film Details */}
        <div className="p-6 bg-gray-900 text-white overflow-y-auto" style={{ width: `${leftPanelWidth}%` }}>
          <div className="flex-grow">
            <h2 className="text-3xl font-semibold mb-4">{selectedFilm.title}</h2>
            <Image
              src={selectedFilm.image && selectedFilm.image !== "noimage" ? selectedFilm.image : "/film.jpg"}
              alt={selectedFilm.title}
              width={500}
              height={1000}
            />
            <p className="mb-2"><strong>Director:</strong> {selectedFilm.b_details["Directed by"]}</p>
            <p className="mb-2"><strong>Language:</strong> {selectedFilm.b_details.Language}</p>
            <p className="mb-2"><strong>Film Duration:</strong> {selectedFilm.b_details["Running time"]}</p>
            <p className="mb-2"><strong>Starring:</strong> {selectedFilm.b_details.Starring}</p>
            <p className="mb-2"><strong>Country:</strong> {selectedFilm.b_details.Country}</p>
          </div>
        </div>

        <div
          className="w-2 bg-black cursor-col-resize"
          onMouseDown={(e) => handleDrag(e)}
          ></div>

        {/* Right Panel for Chat */}
<div className="bg-gray-700 text-white flex flex-col" style={{ width: `${100 - leftPanelWidth}%` }}>
  <div className="p-4 flex justify-end items-center">
    <button
      className="text-white hover:text-gray-300 transition-colors duration-300"
      onClick={handleCloseFilm}
    >
      <X size={24} />
    </button>
  </div>

  {/* Chat History Container */}
<div id="chat-history" className="flex-grow overflow-y-auto p-4 max-h-[60vh]">
  <div className="space-y-4">
    {chatHistory.map((message, index) => (
      <div
        key={index}
        className={`p-3 max-w-[80%] rounded-lg ${
          message.sender === 'user'
            ? 'self-end bg-white text-black ml-auto'  // User question: Right-aligned white blob
            : 'self-start bg-black text-white mr-auto' // Film answer: Left-aligned black blob
        }`}
        style={{
          borderRadius: '30px 20px 30px 30px', // Creates a fluid blob-like shape
          padding: '15px',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.5s ease-in-out',
        }}
      >
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
    ))}

    {/* Show loading spinner while waiting for response */}
    {isChatLoading && (
      <div className="flex justify-center items-center text-white">
        <motion.div
          className="flex justify-center items-center"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          <Loader className="w-8 h-8 text-gray-500 animate-spin" />
        </motion.div>
      </div>
    )}
  </div>
</div>




  {/* Chat Input Form */}
  <form onSubmit={handleChatSubmit} className="p-4 bg-gray-900 mt-auto">
    <div className="flex">
      <input
        type="text"
        value={chatMessage}
        onChange={(e) => setChatMessage(e.target.value)}
        placeholder="Ask anything about the film..."
        className="flex-grow bg-gray-800 text-white rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white"
      />
      <button
        type="submit"
        className="bg-white text-black rounded-r-lg px-4 py-2 hover:bg-gray-300 transition-colors duration-300"
      >
        Deep dive!
      </button>
    </div>
  </form>
</div>

      </motion.div>
    </motion.div>
  )}
</AnimatePresence>



      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
    </div>
  )
}
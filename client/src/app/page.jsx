'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Loader } from 'lucide-react'
import Image from 'next/image'
import axios from 'axios'
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

// Constants
const FILMS_PER_PAGE = 18

const LOADING_STATES = [
  { message: "Understanding your thoughts...", icon: <Search className="w-8 h-8" /> },
  { message: "Analyzing films...", icon: <span className="w-8 h-8">🎬</span> },
  { message: "Finding matches...", icon: <span className="w-8 h-8">🔍</span> }
]

const BASIC_QUESTIONS = [
  "Who directed the film?",
  "What is the main plot?",
  "Who are the main actors?",
  "What is the genre?",
  "When was it released?",
  "What awards did it win?",
  "Is it based on a true story?",
  "Where was it filmed?"
]

const PLACEHOLDER_PROMPTS = [
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

const TRANSLATIONS = [
  { language: 'English', word: 'Film' },
  { language: 'Spanish', word: 'Película' },
  { language: 'French', word: 'Film' },
  { language: 'Japanese', word: '映画' },
  { language: 'German', word: 'Film' }
]

export default function FilmSearch() {
  // Consolidated state management
  const [searchState, setSearchState] = useState({
    query: '',
    results: [],
    totalResults: 0,
    currentPage: 1,
    isSearched: false,
    isLoading: false,
    pageFilmIdObject: {}, // Stores film objects by page
    totalPages: 0 // Tracks total number of pages
  });
  
  
  const [chatState, setChatState] = useState({
    selectedFilm: null,
    history: [],
    message: '',
    isTyping: false,
    typingMessage: ''
  })
  
  const [uiState, setUiState] = useState({
    leftPanelWidth: 50,
    loadingStep: 0,
    placeholderIndex: 0,
    typedPlaceholder: '',
    translationIndex: 0
  })
  
  const textareaRef = useRef(null)

  // Placeholder typing effect
  useEffect(() => {
    if (!searchState.isSearched) {
      const placeholder = PLACEHOLDER_PROMPTS[uiState.placeholderIndex]
      let currentIndex = 0
      
      const interval = setInterval(() => {
        if (currentIndex <= placeholder.length) {
          setUiState(prev => ({ ...prev, typedPlaceholder: placeholder.slice(0, currentIndex) }))
          currentIndex++
        } else {
          clearInterval(interval)
          setTimeout(() => {
            setUiState(prev => ({
              ...prev,
              typedPlaceholder: '',
              placeholderIndex: (prev.placeholderIndex + 1) % PLACEHOLDER_PROMPTS.length
            }))
          }, 2000)
        }
      }, 50)

      return () => clearInterval(interval)
    }
  }, [uiState.placeholderIndex, searchState.isSearched])

  // Translation rotation effect
  useEffect(() => {
    if (!searchState.isSearched) {
      const interval = setInterval(() => {
        setUiState(prev => ({
          ...prev,
          translationIndex: (prev.translationIndex + 1) % TRANSLATIONS.length
        }))
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [searchState.isSearched])

  // Loading animation
  useEffect(() => {
    if (searchState.isLoading) {
      const interval = setInterval(() => {
        setUiState(prev => ({
          ...prev,
          loadingStep: (prev.loadingStep + 1) % LOADING_STATES.length
        }))
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [searchState.isLoading])

  // Search handler
  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchState.query.trim()) return
    setSearchState(prev => ({ ...prev, isLoading: true }))
    try {
      const response = await axios.post(
        process.env.NEXT_PUBLIC_USERQUERY_API,
        { query: searchState.query }
      )
      const filmList = response.data.filmList
      setSearchState(prev => ({
        ...prev,
        pageFilmIdObject: response.data.filmobjects, // Stores the film objects by page
        results: filmList,
        totalResults: Object.keys(response.data.filmList).reduce((acc, page) => acc + response.data.filmList[page].length, 0),
        currentPage: 1,
        totalPages: response.data.noofpages, // Update totalPages from API response
        isSearched: true,
        isLoading: false
      }));
      
    } catch (error) {
      console.error(error)
      setSearchState(prev => ({ ...prev, isLoading: false }))
    }
  }

  // Page change handler
  const handlePageChange = async (page) => {
    setSearchState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Access pageFilmIdObject from the current searchState
      const { pageFilmIdObject } = searchState;
  
      // Fetch data for the selected page from the backend
      const response = await axios.post(
        process.env.NEXT_PUBLIC_PAGEQUERY_API,
        {
          pageNumber: page,
          filmobjectlist: pageFilmIdObject
        }
      );
  
      setSearchState(prev => ({
        ...prev,
        results: response.data.filmList,
        currentPage: page,
        isLoading: false
      }));
    } catch (error) {
      console.error("Error loading page:", error);
      setSearchState(prev => ({ ...prev, isLoading: false }));
    }
  };
  
  

  // Chat handler
  const handleChat = async (e) => {
    e.preventDefault()
    if (!chatState.message.trim()) return
    
    const newMessage = { sender: 'user', text: chatState.message }
    setChatState(prev => ({
      ...prev,
      history: [...prev.history, newMessage],
      message: '',
      isTyping: true
    }))

    try {
      const response = await axios.post(process.env.NEXT_PUBLIC_ANSWERQUERY_API, {
        question: chatState.message,
        filmdetails: chatState.selectedFilm.film_details,
        context: chatState.history.slice(-7).map(chat => `${chat.sender}: ${chat.text}`).join("\n")
      })

      typewriterEffect(response.data)
    } catch (error) {
      console.error(error)
      setChatState(prev => ({
        ...prev,
        history: [...prev.history, { sender: 'film', text: 'Error occurred. Please try again.' }],
        isTyping: false
      }))
    }
  }

  const typewriterEffect = (text, delay = 50) => {
    let currentIndex = 0
    const interval = setInterval(() => {
      setChatState(prev => ({
        ...prev,
        typingMessage: text.slice(0, currentIndex + 1)
      }))
      
      currentIndex++
      if (currentIndex === text.length) {
        clearInterval(interval)
        setChatState(prev => ({
          ...prev,
          history: [...prev.history, { sender: 'film', text }],
          isTyping: false,
          typingMessage: ''
        }))
      }
    }, delay)
  }

  const handleDrag = (e) => {
    const containerWidth = document.querySelector('.max-w-6xl').offsetWidth
    
    const moveHandler = (moveEvent) => {
      const newWidth = ((moveEvent.clientX / containerWidth) * 100)
      setUiState(prev => ({ ...prev, leftPanelWidth: Math.min(Math.max(20, newWidth), 80) }))
    }
    
    document.addEventListener('mousemove', moveHandler)
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', moveHandler)
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-gray-900 flex flex-col items-center p-4">
      <Analytics/>
      <SpeedInsights/>

      {/* Loading Overlay */}
      <AnimatePresence>
        {searchState.isLoading && (
          <motion.div
            className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-white bg-opacity-20 backdrop-blur-md w-80 h-40 p-8 rounded-lg shadow-lg flex flex-col items-center justify-center space-y-4">
              {LOADING_STATES[uiState.loadingStep].icon}
              <p className="text-white text-xl text-center">
                {LOADING_STATES[uiState.loadingStep].message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Section */}
      <motion.div
        className={`w-full max-w-6xl ${searchState.isSearched ? 'mt-8' : 'mt-32'}`}
        animate={{
          scale: searchState.isSearched ? 0.9 : 1,
          y: searchState.isSearched ? -50 : 0
        }}
      >
        <motion.h1 className="text-5xl font-bold text-white mb-8 text-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={TRANSLATIONS[uiState.translationIndex].word}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {TRANSLATIONS[uiState.translationIndex].word}
            </motion.span>
          </AnimatePresence>
          {' '}Search
        </motion.h1>

        <motion.form
          onSubmit={handleSearch}
          className="relative w-4/5 mx-auto"
        >
          <div className="relative flex items-start">
            <textarea
              ref={textareaRef}
              className="w-full bg-white bg-opacity-10 text-white text-xl rounded-2xl py-6 pl-8 pr-20 focus:outline-none focus:ring-2 focus:ring-white focus:bg-opacity-20 transition-all duration-300 resize-none overflow-hidden"
              style={{ height: '100px' }}
              value={searchState.query}
              onChange={(e) => setSearchState(prev => ({ ...prev, query: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSearch(e)
                }
              }}
              placeholder={uiState.typedPlaceholder}
            />
            <motion.button
              className="absolute right-3 top-3 bg-white text-black rounded-xl p-4 focus:outline-none hover:bg-slate-300 transition-colors duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
            >
              <Search className="w-8 h-8" />
            </motion.button>
          </div>
        </motion.form>
      </motion.div>

      {/* Search Results Grid */}
      <AnimatePresence>
        {!searchState.isLoading && searchState.isSearched && !chatState.selectedFilm && (
          <motion.div
            className="w-full max-w-6xl mt-8"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {searchState.results.map((film) => (
            <motion.div key={film.id} className="bg-white bg-opacity-10 rounded-lg overflow-hidden shadow-lg cursor-pointer hover:scale-105 transition-transform duration-300" onClick={() => setChatState(prev => ({ ...prev, selectedFilm: film }))}>
             <div className="relative aspect-[2/3] w-full">
              <Image src={film.poster || "/film.jpg"} alt={film.title} layout="fill" objectFit="cover" />
            </div>
             <div className="p-4">
             <h3 className="text-xl font-semibold text-white mb-2">{film.title}</h3>
             <p className="text-gray-300 text-sm">Director: {film.film_details["directed_by"]}</p>
             <p className="text-gray-300 text-sm">Language: {film.film_details['language']}</p>
             <p className="text-gray-300 text-sm">Country: {film.film_details['country']}</p>
            </div>
            </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {searchState.results.length > 0 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: searchState.totalPages })
                  .map((_, index) => index + 1)
                  .map((page) => (
                 <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 rounded ${
                  searchState.currentPage === page 
                   ? 'bg-white text-black' 
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                   }`}
                 >
              {page}
             </button>
               ))}

              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Film Details Modal */}
      <AnimatePresence>
        {chatState.selectedFilm && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-gray-900 w-full h-full md:w-11/12 md:h-5/6 md:rounded-2xl overflow-hidden relative"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              {/* Close Button */}
              <button
                className="absolute right-4 top-4 text-white p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors duration-300"
                onClick={() => setChatState(prev => ({ ...prev, selectedFilm: null, history: [] }))}
              >
                <X className="w-6 h-6" />
              </button>

              {/* Split Panel Layout */}
              <div className="flex h-full">
                {/* Left Panel - Film Details */}
                <div 
                style={{ width: `${uiState.leftPanelWidth}%` }}
                className="h-full bg-gray-800 p-8 overflow-y-auto"
                  >
                <div className="flex flex-col items-center gap-8">
                {/* Film Title */}
                <h2 className="text-3xl font-bold text-white mb-4 text-center">
                  {chatState.selectedFilm.title}
                </h2>

                {/* Poster Image */}
                <div className="relative w-full max-w-md aspect-[2/3]">
                <Image
                  src={chatState.selectedFilm.poster || "/film.jpg"}
                  alt={chatState.selectedFilm.title}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-lg"
                  />
                </div>

                {/* Basic Film Details */}
                <div className="space-y-4 w-full max-w-md text-left">
                  <p className="text-gray-300 text-md">Director: {chatState.selectedFilm.film_details["directed_by"]}</p>
                  <p className="text-gray-300 text-md">Language: {chatState.selectedFilm.film_details['language']}</p>
                  <p className="text-gray-300 text-md">Country: {chatState.selectedFilm.film_details['country']}</p>
                  <p className="text-gray-300 text-md">Starring: {chatState.selectedFilm.film_details['starring']}</p>
                </div>
              </div>
              </div>


                {/* Drag Handle */}
                <div
                  className="w-1 bg-gray-700 cursor-col-resize hover:bg-white hover:bg-opacity-50 transition-colors duration-300"
                  onMouseDown={handleDrag}
                />

                {/* Right Panel - Chat Interface */}
                <div 
                  style={{ width: `${100 - uiState.leftPanelWidth}%` }}
                  className="h-full flex flex-col"
                >
                  {/* Chat History */}
                  <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {chatState.history.length === 0 ? (
                      <div className="text-center space-y-4 mt-8">
                        <p className="text-gray-400 text-lg">Ask me anything about this film!</p>
                        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                          {BASIC_QUESTIONS.map((question, index) => (
                            <button
                              key={index}
                              className="bg-white bg-opacity-10 text-white p-3 rounded-lg hover:bg-opacity-20 transition-colors duration-300 text-left"
                              onClick={() => setChatState(prev => ({
                                ...prev,
                                message: question
                              }))}
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {chatState.history.map((chat, index) => (
                          <motion.div
                            key={index}
                            className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            <div 
                              className={`max-w-[80%] rounded-2xl p-4 ${
                                chat.sender === 'user' 
                                  ? 'bg-black text-white'
                                  : 'bg-white bg-opacity-85 text-black'
                              }`}
                            >
                              {chat.text}
                            </div>
                          </motion.div>
                        ))}
                        {chatState.isTyping && (
                          <motion.div
                            className="flex justify-start"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            <div className="max-w-[80%] rounded-2xl p-4 bg-white bg-opacity-10 text-white">
                              {chatState.typingMessage}
                              <span className="inline-block animate-pulse">▋</span>
                            </div>
                          </motion.div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleChat} className="p-4 border-t border-gray-700">
                    <div className="relative">
                      <textarea
                        className="w-full bg-white bg-opacity-10 text-white rounded-xl py-4 pl-4 pr-16 focus:outline-none focus:ring-2 focus:ring-white focus:bg-opacity-20 transition-all duration-300 resize-none"
                        style={{ height: '60px' }}
                        value={chatState.message}
                        onChange={(e) => setChatState(prev => ({ ...prev, message: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleChat(e)
                          }
                        }}
                        placeholder="Ask me about this film..."
                      />
                      <motion.button
                        className="absolute right-2 top-2 bg-white text-black rounded-lg p-2 focus:outline-none hover:bg-gray-300 transition-colors duration-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={chatState.isTyping}
                      >
                        <Search className="w-6 h-6" />
                      </motion.button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
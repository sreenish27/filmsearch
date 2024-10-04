# Film Search Platform

Welcome to the **Film Search Platform**, a tool designed to help film lovers discover movies and TV shows based on highly specific themes, ideas, cultural contexts, and more. Our goal is to enable deep exploration into the world of cinema, going beyond mainstream recommendations to unearth unique and lesser-known content from around the world.

## Key Features

- **Advanced Search Engine**: Search for films and TV shows using natural language queries (e.g., "Russian films based on Leo Tolstoy's novels").
- **Expansive Database**: Leveraging a web crawler to index films and TV shows from sources like Wikipedia, our platform curates a comprehensive dataset that allows for highly specific searches.
- **Personalized Recommendations**: Utilizing an open-source LLM (like LLaMA), the platform interprets user intent to deliver precise results based on diverse parameters such as time periods, genres, themes, and cultural influences.
- **Efficient NoSQL Storage**: All data is stored in a NoSQL database (Cassandra) for fast and reliable retrieval.
- **Beautiful, Expandable Movie Cards**: Each search result is presented in an aesthetically pleasing, detailed movie card format with all relevant information and links.
  
## Technology Stack

### Backend:
- **Node.js** with **Express.js**: Handles the backend logic and API routes.
- **Python**: Used for developing the web crawler and integrating the LLM for search capabilities.
- **Supabase**: Provides backend services and database handling.

### Frontend:
- **Next.js**: The frontend framework that powers the user interface and ensures a fast, dynamic user experience.
- **Tailwind CSS**: Provides styling for a clean, minimalist, and responsive UI.

### LLM Integration:
- **LLaMA**: An open-source large language model integrated to interpret complex user queries and return relevant film and TV show results.

### Hosting:
- **Vercel**: Used to host the frontend of the platform.
- **Render**: Hosts the backend services, transitioning from localhost to a Render URL for production-grade availability.

## Key Components

- **Web Crawler**: Built in Python, the crawler scrapes Wikipedia pages of movies and TV shows, indexing information like writers, plots, production details, and more.
- **Search Engine**: Powered by an LLM, it processes natural language queries and searches the Cassandra database to deliver results that align with user interests.
- **Movie/TV Show Cards**: Movie cards where you can "Talk with the film" ask any question you want to know about the film and it will answer in a chatbot manner.

## Setup Instructions

To get the project up and running locally:

### 1. Prerequisites:
- **Node.js** (>=14.x.x)
- **Python** (>=3.x)
- **Supabase Account** (for backend services)
- **Vercel Account** (for hosting the frontend)
- **Render Account** (for hosting the backend)
  
### 2. Clone the repository:

```bash
git clone https://github.com/your-repo/film-search-platform.git
cd film-search-platform
```

### 3. Install Dependencies:

#### Server:
```bash
cd server
npm install
```

#### Client:
```bash
cd client
npm install
```

### 4. Configure Environment Variables:

Create a `.env` file in both the `client` and `server` directories with the necessary API keys and database credentials:

```bash
# .env for Server
PORT=
SUPABASE_URL=
SUPABASE_KEY=
FRONTEND_URL=
SESSION_SECRET=
QUERY_PROCESS=
STRUCTURE_QUERY=

### 5. Run the Project:

#### Backend:
```bash
cd server
nodemon server.js
```

#### Frontend:
```bash
cd client
npm run dev
```

The frontend will be accessible on `http://localhost:3000` and the backend on your Render URL.

### 6. Web Crawler Setup (Optional):

For setting up the web crawler, follow these steps:

```bash
cd crawler
python3 filmcrawler.py
```

This will start scraping the necessary movie and TV show data and populate your Cassandra database.

## Contributing

We welcome contributions! Please open an issue or submit a pull request if you'd like to help improve the platform. Before contributing, make sure to:

- Fork the repository
- Create a new branch (`git checkout -b feature-branch`)
- Submit a pull request with a description of the changes you've made

## Future Enhancements

- **GraphQL Integration**: Plan to integrate GraphQL for more flexible querying in the future.
- **User Preferences**: Add user preferences and login functionalities for personalized experiences.
- **UI/UX Optimization**: Further enhancements to make the platform visually stunning and highly intuitive.

## License

This project is licensed under the MIT License.

# Film Search Platform

A film discovery platform with multi-zone search architecture for finding movies and TV shows based on specific themes, ideas, and cultural contexts.

## Key Features

- **Multi-Zone Search Engine**: Natural language search across title, synopsis, director's notes, location, and genre zones
- **Zone-Based Relevance Ranking**: Intelligent content zone prioritization based on query context
- **Interactive Movie Cards**: Chat interface for detailed film information
- **Comprehensive Database**: Web crawler-indexed films with rich metadata

## Technology Stack

### Backend
- FastAPI (Python)
- PostgreSQL (Supabase)

### Frontend
- Next.js
- Tailwind CSS

### Search Architecture
- Zone-specific TF-IDF calculations
- BM25 scoring system
- Vector-based semantic matching

### Hosting
- Vercel (Frontend + Backend API)
- Render (FastAPI service)

## Setup Instructions

1. **Prerequisites**:
   - Python (>=3.x)
   - Node.js (>=14.x.x)
   - Supabase Account
   - Vercel Account
   - Render Account

2. **Clone and Install**:
```bash
git clone https://github.com/your-repo/film-search-platform.git
cd film-search-platform

# Frontend
npm install

# Backend
cd api
pip install -r requirements.txt
```

3. **Environment Variables**:
```
# .env
SUPABASE_URL=
SUPABASE_KEY=
NEXT_PUBLIC_API_URL=
```

4. **Development**:
```bash
# Frontend
npm run dev

# Backend
uvicorn main:app --reload
```

## Contributing

Open issues or submit pull requests to help improve the platform.

## License

MIT License

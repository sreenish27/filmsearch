import dotenv from "dotenv";

dotenv.config()


export const port = process.env.PORT || 4000;

export const clientUrl = process.env.FRONTEND_URL

export const sessionSecret = process.env.SESSION_SECRET

//supabase config details
export const supabaseUrl = process.env.SUPABASE_URL;
export const supabaseKey = process.env.SUPABASE_KEY;

//groq fastapi endpoints
export const queryprocessapiEndpoint = process.env.QUERY_PROCESS
export const structureQueryEndpoint = process.env.STRUCTURE_QUERY
export const encodeEndpoint = process.env.ENCODE_QUERY
export const concreteinfoEndpoint = process.env.CONCRETEINFO_QUERY
export const unstructuredinfoEndpoint = process.env.UNSTRUCTUREDINFO_QUERY





import { supabase } from "../server.js";

//write a function which will take a film id and return an object with the title, filmdetails and the poster
export const getfilmobject = async (film_id) => {
    const filmobjectresponse = await supabase.rpc('get_film_object', {
        filmid : film_id
    })

    const filmobject = filmobjectresponse.data

    return filmobject
}
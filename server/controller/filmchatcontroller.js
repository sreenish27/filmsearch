import { filmchatEndpoint, encodeEndpoint } from "../config.js";
import axios from "axios";
import { getfilmobject } from "./filmdetailscontroller.js";  // Import the getfilmobject function

//1. accept the question and corresponsding filmobject
//2. use the encode endpoint and vectorize the question asked by the user
//3. pass this to the fastapi endpoint created for the filmchat_engine
//4. get the filtered_dict and give it back to the client side (this will be taken care in the API-side)

export const filmchatengine = async (userquestion, movieobject) => {
    const vec_response = await axios.post(encodeEndpoint, {
        sentence: userquestion
    });
    const question_vector = vec_response.data;

    const response = await axios.post(filmchatEndpoint, {
        filmobject: movieobject,
        vector: question_vector
    });
    const filmchat_selected_dict = response.data.results;

    return filmchat_selected_dict
}

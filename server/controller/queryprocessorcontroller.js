import { supabase } from "../server.js";
import axios from "axios"
import { frameworks_dict } from "../server.js";
import { jsonrepair } from 'jsonrepair';
import {queryprocessapiEndpoint, structureQueryEndpoint, concreteinfoEndpoint, unstructuredinfoEndpoint, encodeEndpoint} from "../config.js"
import pkg from 'body-parser';

const { json } = pkg;

//this is the important sauce which will be the foundation of my search helps in choosing which columns to do similarity search with
const film_categories = {
    "story": {
        "plot": "Plot",
        "synopsis": "General",
        "premise": "General",
        "summary": "General",
        "storyline": "General",
        "themes": "Themes",
        "adaptation": "General",
        "screenplay": "General"
    },
    "production": {
        "production": "Production",
        "development": "General",
        "filming": "General",
        "casting": "General",
        "crew": "General",
        "background": "General"
    },
    "cast": {
        "cast": "Cast"
    },
    "audio": {
        "soundtrack": "Soundtrack",
        "music": "Soundtrack",
        "songs": "Songs",
        "tracklist": "General"
    },
    "release": {
        "release": "Release",
        "distribution": "General",
        "premiere": "General",
        "rerelease": "General",
        "availability": "General",
        "certification": "General"
    },
    "marketing": {
        "marketing": "Marketing",
        "promotion": "General",
        "trailer": "General",
        "publicity": "General"
    },
    "reception": {
        "reception": "Reception",
        "reviews": "General",
        "awards": "Awards",
        "nominations": "General",
        "boxoffice": "General",
        "audience": "General",
        "impact": "General",
        "legacy": "Legacy"
    },
    "sequels": {
        "sequel": "Sequel",
        "prequel": "General",
        "remake": "Remake",
        "spinoff": "General",
        "adaptations": "General",
        "installments": "General",
        "anthologies": "General",
        "miniseries": "General"
    },
    "trivia": {
        "trivia": "Trivia",
        "goofs": "General",
        "influences": "General",
        "inspiration": "General"
    },
    "controversy": {
        "controversies": "Controversies",
        "lawsuit": "General",
        "litigation": "General",
        "allegations": "General",
        "censorship": "General"
    },
    "postrelease": {
        "reappraisal": "General",
        "colourisation": "General",
        "postrelease": "General"
    },
    "miscellaneous": {
        "title": "General",
        "generalinfo": "General",
        "other": "General",
        "related": "General",
        "sources": "General",
        "footnotes": "General",
        "future": "General"
    }
}

//extract only the categories as a list
const categorylist = Object.keys(film_categories);

export const processquery = async (query) => {
    const maxRetries = 5;  // Maximum number of retries
    let attempt = 0;
    let success = false;
    let result = null;
    
    while (attempt < maxRetries && !success) {
        try {
            console.log(`Attempt ${attempt + 1} to process the query`);
            //extract the unstructured info from the query, if there nothing then no need to process the query a simple keyword search will do
            const unstruct_response = await axios.post(unstructuredinfoEndpoint, {
                content: query,
            });
            //a case where if there is nothing to extract which is unstructured from the query
            if (unstruct_response.data != 'Noinfo'){
                // Process query
                const response = await axios.post(queryprocessapiEndpoint, {
                content: unstruct_response.data[0],
                categorylist: categorylist
                });
            
                const sel_categories = jsonrepair(response.data[0]);
                const sel_categories_list = JSON.parse(sel_categories.replace(/'/g, '"'));
                console.log(sel_categories_list[0])

                let search_dict = {};
                let film_list = [];
                for (let cat in sel_categories_list) {
                    const cat_key = sel_categories_list[cat];
                    const col_list = Object.keys(film_categories[cat_key]);
                    const uniqframework_list = [...new Set(Object.values(film_categories[cat_key]))];
                
                    let vec_framework_dict = {};
                
                    for (let frame in uniqframework_list) {
                        //an endpoint to extract concrete info like actors, directors, production houses from the query
                        const con_response = await axios.post(concreteinfoEndpoint, {
                            content:query
                        })
                        const concrete_info = con_response.data[0];
                        console.log(concrete_info)
                        if(concrete_info != 'Nopeople' || concrete_info != 'No people'){
                            const concrete_infolist = jsonrepair(concrete_info)
                            console.log(concrete_infolist)
                            //now run the supabase sql function to get all the films
                            //a variable to select the common films from multiple lists
                            let commonfilm_list = []
                            for (let i in concrete_infolist){
                                let indi_filmlist = []
                                const { data: movie_list_concrete, count } = await supabase.rpc('ge_picture_keyword', {
                                    p_keyword: concrete_infolist[i]
                                }, { count: 'exact' });
                                movie_list_concrete.forEach(row => {
                                    indi_filmlist.push(row.title);
                                });
                                commonfilm_list.push(indi_filmlist)
                            }
                            //now perform an operation to get all the items from all the lists and create a seperate list
                            const commonfilms = commonfilm_list.reduce((common, arr) => common.filter(item => arr.includes(item)));

                            //now insert these into the film_list
                            commonfilms.forEach(row => {
                                film_list.push(row)
                            })
                        }
                    
                        const response = await axios.post(structureQueryEndpoint, {
                            content: query,
                            framework: frameworks_dict[uniqframework_list[frame]]
                        });
                        const vec_response = await axios.post(encodeEndpoint, {
                            sentence: response.data[0]
                        });
                        vec_framework_dict[uniqframework_list[frame]] = vec_response.data;
                    }
                
                    for (let col in col_list) {
                        search_dict[col_list[col]] = vec_framework_dict[film_categories[cat_key][col_list[col]]];
                    }
                }
            
                const search_data = Object.entries(search_dict);
            
            
                for (let col_vec in search_data) {
                    if (film_list.length == 0){
                        const movie_list = await supabase.rpc('similarity_search', {
                            t_name: 'filminfo',
                            c_name: search_data[col_vec][0],
                            q_embedding: search_data[col_vec][1],
                            m_threshold: 0.2,
                            m_count: 1
                        });

                        for (let movie in movie_list.data) {
                            film_list.push(movie_list.data[movie]);
                        }
                        let film_details_list = [];
                        film_list = [...new Set(film_list)]
                        for (let film in film_list) {
                            let film_dict = {};
                            film_dict['id'] = film + 1;
                            film_dict['title'] = film_list[film];
                
                            const film_details = await supabase.rpc('get_film_details', {
                                table_name: 'films',
                                column_name: 'film_details',
                                title: film_list[film]
                            });
                
                            film_dict['b_details'] = film_details.data[0]['result']['film_details'];
                
                            const rawdata = await supabase.rpc('get_film_details', {
                                table_name: 'filminfo',
                                column_name: 'rawdata',
                                title: film_list[film]
                            });
                
                            film_dict['o_details'] = rawdata.data[0]['result']['rawdata'];
                
                            const image = await supabase.rpc('get_film_details', {
                                table_name: 'films',
                                column_name: 'image',
                                title: film_list[film]
                            });
                
                            film_dict['image'] = image.data[0]['result']['image'] || 'noimage';
                
                            film_details_list.push(film_dict);
                        }
            
                        result = film_details_list;
                        success = true;  // Exit the loop since the operation was successful

                        return result;

                    }
                    else {
                        const movie_list = await supabase.rpc('targeted_similarity_search', {
                            t_name: 'filminfo',
                            c_name: search_data[col_vec][0],
                            q_embedding: search_data[col_vec][1],
                            m_threshold: 0.2,
                            m_count: 1,
                            title_list: film_list
                        });
                        let film_details_list = [];
                        const movie_list_final = [...new Set(movie_list.data)]
                        for (let film in movie_list_final) {
                            let film_dict = {};
                            film_dict['id'] = film + 1;
                            film_dict['title'] = movie_list_final[film];
                
                            const film_details = await supabase.rpc('get_film_details', {
                                table_name: 'films',
                                column_name: 'film_details',
                                title: movie_list_final[film]
                            });
                
                            film_dict['b_details'] = film_details.data[0]['result']['film_details'];
                
                            const rawdata = await supabase.rpc('get_film_details', {
                                table_name: 'filminfo',
                                column_name: 'rawdata',
                                title: movie_list_final[film]
                            });
                
                            film_dict['o_details'] = rawdata.data[0]['result']['rawdata'];
                
                            const image = await supabase.rpc('get_film_details', {
                                table_name: 'films',
                                column_name: 'image',
                                title: movie_list_final[film]
                            });
                
                            film_dict['image'] = image.data[0]['result']['image'] || 'noimage';
                
                            film_details_list.push(film_dict);
                        }
            
                        result = film_details_list;
                        success = true;  // Exit the loop since the operation was successful

                        return result;
                    }                   
                }
                

            }
            else if (unstruct_response.data == 'Noinfo') {
                let film_list = []
                //an endpoint to extract concrete info like actors, directors, production houses from the query
                const con_response = await axios.post(concreteinfoEndpoint, {
                    content:query
                })
                const concrete_info = jsonrepair(con_response.data[0]);
                const concrete_infolist = JSON.parse(concrete_info.replace(/'/g, '"'));
                console.log(concrete_infolist)
                //now run the supabase sql function to get all the films
                //a variable to select the common films from multiple lists
                let commonfilm_list = []
                for (let i in concrete_infolist){
                    let indi_filmlist = []
                    const { data: movie_list_concrete, count } = await supabase.rpc('ge_picture_keyword', {
                        p_keyword: concrete_infolist[i]
                    }, { count: 'exact' });
                     console.log(movie_list_concrete)
                    movie_list_concrete.forEach(row => {
                        indi_filmlist.push(row.title);
                    });
                    commonfilm_list.push(indi_filmlist)
                }
                //now perform an operation to get all the items from all the lists and create a seperate list
                const commonfilms = commonfilm_list.reduce((common, arr) => common.filter(item => arr.includes(item)));

                //now insert these into the film_list
                commonfilms.forEach(row => {
                    film_list.push(row)
                })
                console.log(film_list)
                let film_details_list = [];
                film_list = [...new Set(film_list)]
                for (let film in film_list) {
                    let film_dict = {};
                    film_dict['id'] = film + 1;
                    film_dict['title'] = film_list[film];
                
                    const film_details = await supabase.rpc('get_film_details', {
                        table_name: 'films',
                        column_name: 'film_details',
                        title: film_list[film]
                    });
                
                    film_dict['b_details'] = film_details.data[0]['result']['film_details'];
                
                    const rawdata = await supabase.rpc('get_film_details', {
                        table_name: 'filminfo',
                        column_name: 'rawdata',
                        title: film_list[film]
                    });
                
                    film_dict['o_details'] = rawdata.data[0]['result']['rawdata'];
                
                    const image = await supabase.rpc('get_film_details', {
                        table_name: 'films',
                        column_name: 'image',
                        title: film_list[film]
                    });
                
                    film_dict['image'] = image.data[0]['result']['image'] || 'noimage';
                
                    film_details_list.push(film_dict);
                }
            
                result = film_details_list;
                success = true;  // Exit the loop since the operation was successful

                return result;
            }
                       
            
        } catch (err) {
            console.error(`Error on attempt ${attempt + 1}:`, err);
            attempt++;
            
            if (attempt < maxRetries) {
                console.log(`Retrying in ${(attempt * 2)} seconds...`);
                await new Promise(resolve => setTimeout(resolve, attempt * 2000));  // Exponential backoff
            } else {
                console.error("Max retries reached. Could not process the query.");
                throw err;
            }
        }
    }
    
};

from scrapy.spiders import CrawlSpider, Rule
from scrapy.linkextractors import LinkExtractor

class filmCrawlingSpider(CrawlSpider):
    name = "filmcrawlerindian"
    allowed_domains = ["wikipedia.org"]
    start_urls = ["https://en.wikipedia.org/wiki/List_of_Punjabi_films"]

    rules = (
        Rule(LinkExtractor(allow = r"wiki/List_of_Punjabi_films.*"), 
             callback="film_year_list_parse"),
             )

    def film_year_list_parse(self, response):
        film_list = response.css('table.wikitable tbody tr td i a::attr(href)').getall()
        for film_url in film_list:
            yield response.follow(film_url, self.film_parse)

    def film_parse(self, response):
        #extracts the subheadings in the page as a list, this is will be used to iterate further so that nothing about the film/tv show is missed
        page_contents = response.css('div#vector-toc .vector-toc-text span:not(.vector-toc-numb)::text').getall()

        #list of contents I do not want
        remove_contents = ['References', 'External links', 'Bibliography', 'Notes']

        page_contents = [content for content in page_contents if content not in remove_contents]
        #a dictionary to store all the info about a film/tv show
        film_info = {}

         #getting the info on the top of the page because some old films has only that
        table_tag = response.css('table.infobox.vevent')

       #get the info from the infobox and put it in appropriate fashion
        rows = table_tag.css('tbody tr')[1:].getall()

        i = 1

        while(i < len(rows) + 1):
            film_info[' '.join((table_tag.css('tbody tr')[i]).css('th.infobox-label ::text').getall()).strip()] = ' '.join((table_tag.css('tbody tr')[i]).css('td ::text').getall()).strip()
            i = i + 1

        if table_tag:
            following_tags = table_tag.xpath('following::*')
            #list for all the content
            top_textcontent = []
            for tag in following_tags:
                if tag.root.tag == 'div.mw-heading.mw-heading2':
                    break
                if tag.root.tag in ['p']:
                    top_textcontent.extend(tag.css('*::text').getall())
            film_info['generalinfo'] = ' '.join(top_textcontent).strip()

        #loop through the page_contents list to extract all the info
        for content in page_contents:
            # Select the <h2> element with the specific id
            h2_element = response.xpath(f'//h2[@id="{content}"]')
            
            if h2_element:
                # Select all elements following the <h2> element
                following_elements = h2_element.xpath('following::*')
                
                # Initialize a list to collect text content
                text_content = []
                
                # Iterate over following elements and collect text until the next <h2>
                for element in following_elements:
                    # Break the loop if the element is an <h2>
                    if element.root.tag == 'h2':
                        break
                    # Collect text from the element
                    if element.root.tag in ['p', 'h3', 'ul', 'table']:
                        text_content.extend(element.css('*::text').getall())
                
                        # Join the text content and store it in the dictionary
                        film_info[content] = ' '.join(text_content).strip()
               
        yield{
            response.css('table.infobox.vevent tbody tr th.infobox-above.summary::text').get() : film_info
            }
    


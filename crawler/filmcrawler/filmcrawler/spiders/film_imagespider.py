import scrapy
import base64
import json
from scrapy.spiders import CrawlSpider, Rule
from scrapy.linkextractors import LinkExtractor
from io import BytesIO
from PIL import Image
import os

class FilmCrawlingSpider(CrawlSpider):
    name = "filmimagecrawler"
    allowed_domains = ["wikipedia.org", "upload.wikimedia.org"]
    start_urls = ["https://en.wikipedia.org/wiki/Lists_of_Tamil-language_films"]

    rules = (
        Rule(LinkExtractor(allow=r"wiki/List_of_Tamil_films_of.*"), 
             callback="film_year_list_parse"),
    )

    custom_settings = {
        'DOWNLOAD_DELAY': 2,  
        'AUTOTHROTTLE_ENABLED': True,
        'AUTOTHROTTLE_START_DELAY': 1,
        'AUTOTHROTTLE_MAX_DELAY': 10,
        'AUTOTHROTTLE_TARGET_CONCURRENCY': 1.0,
        'RETRY_TIMES': 5,
        'RETRY_HTTP_CODES': [429, 503],
        'CONCURRENT_REQUESTS_PER_DOMAIN': 2,
    }

    def __init__(self, *args, **kwargs):
        super(FilmCrawlingSpider, self).__init__(*args, **kwargs)
        self.processed_films = self.load_existing_film_images()

    def load_existing_film_images(self):
        """Loads existing film data from 'film_images.jsonl' to avoid duplicates."""
        processed_films = set()

        if os.path.exists("film_images.jsonl"):
            with open("film_images.jsonl", "r") as f:
                for line in f:
                    film_data = json.loads(line)
                    processed_films.add(film_data.get("movie_name"))

        return processed_films

    def film_year_list_parse(self, response):
        film_list = response.css('table.wikitable tbody tr td i a::attr(href)').getall()
        for film_url in film_list:
            yield response.follow(film_url, self.film_parse)

    def film_parse(self, response):
        movie_name = response.css('table.infobox.vevent tbody tr th.infobox-above.summary::text').get()
        if not movie_name:
            movie_name = response.css('h1#firstHeading::text').get()

        if movie_name in self.processed_films:
            self.logger.info(f"Skipping already processed movie: {movie_name}")
            return

        self.logger.info(f"Processing movie: {movie_name}")

        image_url = response.css('img.mw-file-element::attr(src)').get()
        if image_url:
            image_url = response.urljoin(image_url)

            self.logger.info(f"Found image URL: {image_url} for {movie_name}")

            yield scrapy.Request(image_url, callback=self.parse_image, meta={'movie_name': movie_name})
        else:
            self.logger.warning(f"No image found for {movie_name}")

    def parse_image(self, response):
        movie_name = response.meta['movie_name']

        try:
            img = Image.open(BytesIO(response.body))
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

            # Save the result only if it's a new movie
            if movie_name not in self.processed_films:
                self.save_film_image(movie_name, img_base64)
                yield {
                    'movie_name': movie_name,
                    'image_base64': img_base64
                }

        except Exception as e:
            self.logger.error(f"Error processing image for {movie_name}: {e}")

    def save_film_image(self, movie_name, img_base64):
        """Saves the film image and adds it to 'film_images.jsonl'."""
        with open("film_images.jsonl", "a") as f:
            film_data = {
                'movie_name': movie_name,
                'image_base64': img_base64
            }
            f.write(json.dumps(film_data) + "\n")

        # Add to processed films to prevent reprocessing
        self.processed_films.add(movie_name)

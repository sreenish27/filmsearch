from scrapy.spiders import CrawlSpider, Rule
from scrapy.linkextractors import LinkExtractor
from scrapy.selector import Selector
import re

class FilmCrawlingSpider(CrawlSpider):
    name = "filmcrawleramerican"
    allowed_domains = ["wikipedia.org"]
    start_urls = ["https://en.wikipedia.org/wiki/List_of_Marathi_films"]

    rules = (
        Rule(
            LinkExtractor(allow=r"wiki/List_of_Marathi_films_of.*"),
            callback="parse_film_year_list",
            follow=True
        ),
    )

    def clean_text(self, text):
        """
        Cleans text by removing unwanted patterns, style content, and extra whitespace.
        """
        if not text:
            return None

        # Remove style content
        style_pattern = r'<style.*?>.*?</style>'
        text = re.sub(style_pattern, '', text, flags=re.DOTALL)

        # Remove the plainlist pattern
        plainlist_pattern = r'\.mw-parser-output \.plainlist.*?padding:0}'
        text = re.sub(plainlist_pattern, '', text, flags=re.DOTALL)

        # Clean extra whitespace and newlines
        text = ' '.join(text.split())
        return text.strip() or None

    def normalize_field_name(self, field_name):
        """
        Normalizes field names to lowercase and replaces spaces with underscores.
        """
        if field_name:
            return '_'.join(field_name.lower().split())
        return None

    def parse_film_year_list(self, response):
        """
        Parses the yearly film list pages and extracts links to individual films.
        """
        film_rows = response.xpath('//table[contains(@class, "wikitable")]//tbody//tr//td//i/a')

        for film_link in film_rows:
            href = film_link.xpath('./@href').get()
            link_title = film_link.xpath('./text()').get()

            if href and href.startswith('/wiki/'):
                full_url = f"https://en.wikipedia.org{href}"
                yield response.follow(
                    url=full_url,
                    callback=self.parse_film_page,
                    meta={'link_title': link_title}
                )

    def parse_film_page(self, response):
        """
        Parses individual film pages to extract title, infobox data, and additional sections.
        """
        # Extract title from infobox or fallback options
        title = (
            response.xpath('//table[contains(@class, "infobox")]//tbody//tr/th[contains(@class, "infobox-above")]/text()').get()
            or response.xpath('//h1[@id="firstHeading"]//text()').get()
            or response.meta.get('link_title')
        )
        title = self.clean_text(title)

        # Initialize film data with the title
        film_data = {'title': title}

        # Check if the infobox exists
        infobox_exists = response.xpath('//table[contains(@class, "infobox")]').get()

        if infobox_exists:
            # Extract key-value pairs from the infobox
            infobox_rows = response.xpath('//table[contains(@class, "infobox")]//tbody//tr')
            for row in infobox_rows:
                label = row.xpath('.//th[contains(@class, "infobox-label")]/text()').get()
                if label:
                    normalized_label = self.normalize_field_name(self.clean_text(label))
                    value = row.xpath('.//td[contains(@class, "infobox-data")]//text()[not(ancestor::style)]').getall()
                    cleaned_value = self.clean_text(' '.join(value))
                    if cleaned_value:
                        film_data[normalized_label] = cleaned_value

            # Extract <p> tags after the infobox until the first section heading
            intro_paragraphs = response.xpath('//table[contains(@class, "infobox")]/following-sibling::p')
        else:
            # If no infobox, extract <p> tags from the top of the page
            intro_paragraphs = response.xpath('//p')

        # Collect introduction content from the relevant <p> tags
        current_content = []
        for p in intro_paragraphs:
            paragraph = p.xpath('.//text()[not(ancestor::style)]').getall()
            if paragraph:
                cleaned_paragraph = self.clean_text(' '.join(paragraph))
                if cleaned_paragraph:
                    current_content.append(cleaned_paragraph)

        # Store collected <p> content under 'generalinfo'
        if current_content:
            film_data['generalinfo'] = ' '.join(current_content)

        # Extract sections and their content
        sections = response.xpath('//div[contains(@class, "mw-heading") and contains(@class, "mw-heading2")]')

        for section in sections:
            # Extract the heading name
            heading = section.xpath('./h2//text()').get()
            heading = self.clean_text(heading)
            normalized_heading = self.normalize_field_name(heading)

            # Skip unwanted sections
            if normalized_heading and normalized_heading not in {"references", "further_reading", "external_links", "bibliography"}:
                section_content = []
                next_siblings = section.xpath('following-sibling::*')

                for sibling in next_siblings:
                    # Stop when we encounter another section heading
                    if sibling.xpath('self::div[contains(@class, "mw-heading") and contains(@class, "mw-heading2")]'):
                        break

                    # Collect content from relevant tags like <p> and <ul>
                    content = sibling.xpath('.//text()[not(ancestor::style)]').getall()
                    if content:
                        cleaned_content = self.clean_text(' '.join(content))
                        if cleaned_content:
                            section_content.append(cleaned_content)

                if section_content:
                    film_data[normalized_heading] = ' '.join(section_content)

        # Yield the final film data
        yield film_data

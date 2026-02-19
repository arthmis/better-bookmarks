use fuse_rust::{Fuse, FuseProperty, Fuseable};
use wasm_bindgen::prelude::*;
use web_sys::console;

#[derive(Debug, Clone)]
struct Bookmark {
    pub id: String,
    pub title: String,
    pub url: String,
}

impl Fuseable for Bookmark {
    fn properties(&self) -> Vec<fuse_rust::FuseProperty> {
        return vec![
            FuseProperty {
                value: String::from("title"),
                weight: 0.6,
            },
            FuseProperty {
                value: String::from("url"),
                weight: 0.4,
            },
        ];
    }

    fn lookup(&self, key: &str) -> Option<&str> {
        match key {
            "id" => Some(&self.id),
            "title" => Some(&self.title),
            "url" => Some(&self.url),
            _ => None,
        }
    }
}

#[wasm_bindgen]
pub struct SearchEngine {
    inner: Fuse,
    data_set: Vec<Bookmark>,
}

#[wasm_bindgen]
impl SearchEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console::info_1(&"building search engine".to_string().into());
        Self {
            inner: Fuse {
                location: 0,
                distance: 100,
                threshold: 0.4,
                max_pattern_length: 32,
                is_case_sensitive: false,
                tokenize: false,
            },
            data_set: Vec::new(),
        }
    }

    pub fn load_dataset(&mut self, buffer: &[u8]) {
        let Ok(content) = std::str::from_utf8(buffer) else {
            console::error_1(
                &"loading data set failed at turning bytes into string"
                    .to_string()
                    .into(),
            );
            return;
        };

        let bookmarks = content.lines().into_iter().filter_map(|line| {
            let mut components = line.split("\0");
            let Some(id) = components.next() else {
                return None;
            };
            let Some(title) = components.next() else {
                return None;
            };
            let Some(url) = components.next() else {
                return None;
            };
            let bookmark = Bookmark {
                id: id.to_string(),
                title: title.to_string(),
                url: url.to_string(),
            };

            Some(bookmark)
        });

        self.data_set = bookmarks.collect();
    }

    pub fn search(&self, query: &str) -> Vec<u8> {
        let results: Vec<String> = self
            .inner
            .search_text_in_fuse_list(query, &self.data_set)
            .iter()
            .filter_map(|search_result| {
                if search_result.score < 0.5 {
                    let bookmark = &self.data_set[search_result.index];
                    let text = format!("{}\0{}", &bookmark.url, &bookmark.title);
                    return Some(text);
                }

                None
            })
            .collect();

        let output_string = results.join("\n");
        return output_string.into_bytes();
    }

    pub fn add_entries(&mut self, buffer: &[u8]) {
        let Ok(content) = std::str::from_utf8(buffer) else {
            // todo console log here
            return;
        };

        let bookmarks = content.lines().into_iter().filter_map(|line| {
            let mut components = line.split('\0');
            let Some(id) = components.next() else {
                return None;
            };
            let Some(title) = components.next() else {
                return None;
            };
            let Some(url) = components.next() else {
                return None;
            };
            let bookmark = Bookmark {
                id: id.to_string(),
                title: title.to_string(),
                url: url.to_string(),
            };

            console::log_2(&bookmark.title.clone().into(), &bookmark.url.clone().into());

            Some(bookmark)
        });

        self.data_set.extend(bookmarks);
    }

    pub fn remove_entry(&mut self, id: &str) {
        self.data_set.retain(|bookmark| bookmark.id != id);
    }
}

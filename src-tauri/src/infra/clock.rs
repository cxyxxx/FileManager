use chrono::{Datelike, Local, SecondsFormat, Utc};

pub fn now_iso() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true)
}

pub fn year_month_segments() -> (String, String) {
    let now = Local::now();
    (format!("{:04}", now.year()), format!("{:02}", now.month()))
}

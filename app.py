import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from bs4 import BeautifulSoup
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}


def fetch_release_notes():
    req = urllib.request.Request(
        FEED_URL,
        headers={"User-Agent": "BigQuery-Release-Notes-Reader/1.0"}
    )
    with urllib.request.urlopen(req, timeout=15) as response:
        xml_data = response.read()

    root = ET.fromstring(xml_data)

    feed_title = root.findtext("atom:title", default="BigQuery Release Notes", namespaces=ATOM_NS)
    feed_updated = root.findtext("atom:updated", default="", namespaces=ATOM_NS)

    entries = []
    item_counter = 0

    for entry in root.findall("atom:entry", namespaces=ATOM_NS):
        entry_title = entry.findtext("atom:title", default="Update", namespaces=ATOM_NS)
        entry_id = entry.findtext("atom:id", default="", namespaces=ATOM_NS)
        entry_updated = entry.findtext("atom:updated", default="", namespaces=ATOM_NS)
        
        link_elem = entry.find("atom:link", namespaces=ATOM_NS)
        entry_link = link_elem.attrib.get("href", "") if link_elem is not None else ""
        if not entry_link:
            entry_link = "https://docs.cloud.google.com/bigquery/docs/release-notes"

        raw_content = entry.findtext("atom:content", default="", namespaces=ATOM_NS)
        soup = BeautifulSoup(raw_content, "html.parser")

        # Rewrite relative links if any
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            if href.startswith("/"):
                a_tag["href"] = f"https://docs.cloud.google.com{href}"
            a_tag["target"] = "_blank"
            a_tag["rel"] = "noopener noreferrer"

        # Break entry content by <h3> headers (e.g. Feature, Breaking, Change, Announcement)
        sub_items = []
        current_type = "Update"
        curr_nodes = []

        for node in soup.children:
            if not getattr(node, "name", None):
                if str(node).strip():
                    curr_nodes.append(node)
                continue

            if node.name == "h3":
                if curr_nodes:
                    node_html = "".join(str(n) for n in curr_nodes).strip()
                    node_text = BeautifulSoup(node_html, "html.parser").get_text(" ", strip=True)
                    item_counter += 1
                    sub_items.append({
                        "id": f"item-{item_counter}",
                        "type": current_type,
                        "html": node_html,
                        "text": node_text
                    })
                    curr_nodes = []
                current_type = node.get_text(strip=True) or "Update"
            else:
                curr_nodes.append(node)

        if curr_nodes:
            node_html = "".join(str(n) for n in curr_nodes).strip()
            node_text = BeautifulSoup(node_html, "html.parser").get_text(" ", strip=True)
            item_counter += 1
            sub_items.append({
                "id": f"item-{item_counter}",
                "type": current_type,
                "html": node_html,
                "text": node_text
            })

        # Fallback if no <h3> tags were present
        if not sub_items and raw_content.strip():
            plain_text = soup.get_text(" ", strip=True)
            item_counter += 1
            sub_items.append({
                "id": f"item-{item_counter}",
                "type": "Update",
                "html": str(soup),
                "text": plain_text
            })

        entries.append({
            "id": entry_id,
            "title": entry_title,
            "updated": entry_updated,
            "link": entry_link,
            "items": sub_items
        })

    return {
        "title": feed_title,
        "updated": feed_updated,
        "fetched_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_entries": len(entries),
        "entries": entries
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/feed")
def get_feed():
    try:
        data = fetch_release_notes()
        return jsonify({"success": True, "data": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)

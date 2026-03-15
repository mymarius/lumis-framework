'use strict';

const { Colors } = require('../utils/Constants');

class Embed {
  
  constructor(data = {}) {
    this.data = { ...data };
  }

  setTitle(title) {
    this.data.title = title?.slice(0, 256) ?? null;
    return this;
  }

  setDescription(description) {
    this.data.description = description?.slice(0, 4096) ?? null;
    return this;
  }

  setURL(url) {
    this.data.url = url ?? null;
    return this;
  }

  setColor(color) {
    if (typeof color === 'string') {
      if (color.startsWith('#')) {
        this.data.color = parseInt(color.slice(1), 16);
      } else if (Colors[color.toUpperCase()]) {
        this.data.color = Colors[color.toUpperCase()];
      } else {
        this.data.color = parseInt(color, 16);
      }
    } else {
      this.data.color = color;
    }
    return this;
  }

  setTimestamp(timestamp) {
    if (timestamp === undefined || timestamp === null) {
      this.data.timestamp = new Date().toISOString();
    } else if (timestamp instanceof Date) {
      this.data.timestamp = timestamp.toISOString();
    } else if (typeof timestamp === 'number') {
      this.data.timestamp = new Date(timestamp).toISOString();
    } else {
      this.data.timestamp = timestamp;
    }
    return this;
  }

  setFooter(text, iconURL) {
    this.data.footer = {
      text: text?.slice(0, 2048),
      icon_url: iconURL,
    };
    return this;
  }

  setThumbnail(url) {
    this.data.thumbnail = { url };
    return this;
  }

  setImage(url) {
    this.data.image = { url };
    return this;
  }

  setAuthor(name, iconURL, url) {
    this.data.author = {
      name: name?.slice(0, 256),
      icon_url: iconURL,
      url,
    };
    return this;
  }

  addField(name, value, inline = false) {
    if (!this.data.fields) this.data.fields = [];
    if (this.data.fields.length >= 25) {
      throw new Error('Embed can only contain 25 fields.');
    }
    this.data.fields.push({
      name: String(name).slice(0, 256),
      value: String(value).slice(0, 1024),
      inline: Boolean(inline),
    });
    return this;
  }

  addFields(...fields) {
    const flatFields = fields.flat();
    for (const field of flatFields) {
      this.addField(field.name, field.value, field.inline);
    }
    return this;
  }

  clearFields() {
    this.data.fields = [];
    return this;
  }

  addBlankField(inline = false) {
    return this.addField('\u200b', '\u200b', inline);
  }

  toJSON() {
    return { ...this.data };
  }

  get length() {
    let total = 0;
    if (this.data.title) total += this.data.title.length;
    if (this.data.description) total += this.data.description.length;
    if (this.data.footer?.text) total += this.data.footer.text.length;
    if (this.data.author?.name) total += this.data.author.name.length;
    if (this.data.fields) {
      for (const field of this.data.fields) {
        total += (field.name?.length || 0) + (field.value?.length || 0);
      }
    }
    return total;
  }

  static from(data) {
    return new Embed(data);
  }

  get length() {
    let total = 0;
    if (this.data.title) total += this.data.title.length;
    if (this.data.description) total += this.data.description.length;
    if (this.data.footer?.text) total += this.data.footer.text.length;
    if (this.data.author?.name) total += this.data.author.name.length;
    if (this.data.fields) {
      for (const field of this.data.fields) {
        total += (field.name?.length || 0) + (field.value?.length || 0);
      }
    }
    return total;
  }

  isValid() {
    if (this.length > 6000) return false;
    if (this.data.fields && this.data.fields.length > 25) return false;
    return true;
  }
}

module.exports = Embed;

// Copyright (c)2021 Quinn Michaels
// The Wiki Deva

const Deva = require('@indra.ai/deva');
const axios = require('axios');
const {agent,vars} = require('./data.json').DATA;

const package = require('./package.json');
const info = {
  id: package.id,
  name: package.name,
  describe: package.description,
  version: package.version,
  url: package.homepage,
  dir: __dirname,
  git: package.repository.url,
  bugs: package.bugs.url,
  author: package.author,
  license: package.license,
  copyright: package.copyright,
};

const WIKI = new Deva({
  info,
  agent,
  vars,
  utils: {
    translate(input) {return input.trim();},
    parse(input) {return input.trim();},
    process(input) {return input.trim();},
  },
  listeners: {},
  modules: {},
  func: {
    /**************
    func: summary
    params: str
    describe: Return a summary for a specific string value.
    ***************/
    summary(str) {
      this.action('func', 'summary');
      return new Promise((resolve, reject) => {
        const uri = this.vars.summary + str;
        const data = {};
        axios.get(uri).then(result => {
          console.log('RESULT', result.data);
          data.wiki = result.data;
          const text = [
            `::begin:wiki`,
            `#### ${data.wiki.title}`,
            `::begin:summary`,
            data.wiki.thumbnail ? `image: ${data.wiki.thumbnail.source}` : '',
            `describe: ${data.wiki.extract.replace(/\n|\r/g, ' ')}`,
            `::end:summary`,
            `link[${this.vars.messages.open}]:${data.wiki.content_urls.desktop.page}`,
            '::end:wiki',
          ].join('\n');
          return this.question(`${this.askChr}feecting parse ${text}`);
        }).then(parsed => {
          data.feecting = parsed.a.data;
          return resolve({
            text:parsed.a.text,
            html:parsed.a.html,
            data,
          });
        }).catch(err => {
          switch (err.response.status) {
            case 404:
              return resolve({
                text: 'not found',
                html: 'not found',
                data: err.response.data
              });
            default:
              return this.error(str, err, reject);
          }
        })
      });
    },

    /**************
    func: search
    params: text
    describe: Return search result based on string input.
    ***************/
    search(text) {
      this.action('func', 'search');
      return new Promise((resolve, reject) => {
        const data = {};
        axios.get(this.vars.search_url).then(result => {
          console.log('SEARCH RESULT', result.data);
          data.wiki = result.data.query.search.map(s => {
            console.log('S', s);
            return [
              `\n## ${s.title}`,
              `p:${s.snippet}`,
              `cmd:#wiki summary ${s.title}`,
            ].join('\n');
          });
          return this.question(`${this.askChr}feecting parse ${data.wiki.join('\n')}`);
        }).then(parsed => {
          data.feecting = parsed.a.data;
          const {text,html} = parsed.a;
          return resolve({
            text: parsed.a.text,
            html: parsed.a.html,
            data,
          });
        }).catch(err => {
          console.log('SEARCH WIKI ERROR', err);
          return this.error(text, err, reject);
        });
      });
    },

    /**************
    func: page
    params: id
    describe: Return a wiki page based on id parameter.
    ***************/
    page(id) {
      this.action('func', 'page');
      return new Promise((resolve, reject) => {
        axios.get(this.vars.page_url).then(result => {
          return resolve({
            text:result.data.parse.text,
            html:result.data.parse.text,
            data: result.data.parse
          });
        }).catch(err => {
          return this.error(id, err, reject);
        });
      });
    },
  },

  methods: {
    /**************
    method: search
    params: packet
    describe: Search method to call the search function to return wiki results.
    ***************/
    search(packet) {
      this.context('search', packet.q.text);
      this.action('method', 'search');
      this.vars.current = packet.q.meta.params[1] || this.vars.current;
      this.vars.search_url = `${this.vars.api[this.vars.current]}${this.vars.search_str}${packet.q.text}`;
      return this.func.search(packet.q.text);
    },

    /**************
    method: page
    params: packet
    describe: Return a wiki page from the specicif page id passed in from the packet.
    ***************/
    page(packet) {
      this.context('page');
      this.action('method', 'page');
      this.vars.current = packet.q.meta.params[1] || this.vars.current;
      this.vars.page_url = this.vars.api[this.vars.current] + this.vars.page_str + packet.q.text;
      return this.func.page(packet.q.text);
    },

    /**************
    method: summary
    params: packet
    describe: Return a summary result from the summary function.
    ***************/
    summary(packet) {
      this.context('summary', packet.q.text);
      this.action('method', 'summary');
      return this.func.summary(packet.q.text);
    },
  },
  onError(err) {
    console.log('WIKI ERROR', err);
  },
});
module.exports = WIKI

// Copyright (c)2021 Quinn Michaels
const fs = require('fs');
const path = require('path');

const data_path = path.join(__dirname, 'data.json');
const {agent,vars} = require(data_path).data;

const Deva = require('@indra.ai/deva');
const WIKI = new Deva({
  agent: {
    uid: agent.uid,
    key: agent.key,
    name: agent.name,
    describe: agent.describe,
    prompt: agent.prompt,
    voice: agent.voice,
    profile: agent.profile,
    translate(input) {
      return input.trim();
    },
    parse(input) {
      return input.trim();
    }
  },
  vars,
  deva: {},
  listeners: {},
  modules: {},
  func: {

    summary(str) {
      return new Promise((resolve, reject) => {
        const uri = this.vars.summary + str;
        let data;
        this.question(`#web get ${uri}`).then(result => {
          data = result.a.data;
          console.log('wiki summary', JSON.stringify(result.a.data, null, 2));

          const text = [
            `::begin:wiki`,
            `#### ${data.title}`,
            `::begin:summary`,
            data.thumbnail ? `thumbnail:${data.thumbnail.source}` : '',
            `describe:${data.extract.replace(/\n|\r/g, ' ')}`,
            `::end:summary`,
            `link[${this.vars.messages.open}]:${data.content_urls.desktop.page}`,
            '::end:wiki',
          ].join('\n');
          return this.question(`#feecting parse ${text}`);
        }).then(parsed => {
          return resolve({
            text:parsed.a.text,
            html:parsed.a.html,
            data,
          });
        }).catch(err => {
          return this.error(text, err, reject);
        })
      });
    },

    search(text) {
      return new Promise((resolve, reject) => {
        let data;
        this.question(`#web get ${this.vars.search_url}`).then(result => {
          data = result.a.data.query.search.map(s => {
            return [
              `\n## ${s.title}`,
              `p:${s.snippet}`,
              `cmd[Wiki Page ${s.title}]:#wiki page ${s.pageid}`,
            ].join('\n');
          });
          return this.question(`#feecting parse:${this.agent.key} ${data.join('\n')}`);
        }).then(parsed => {
          const {text,html} = parsed.a;
          return resolve({
            text: parsed.a.text,
            html: parsed.a.html,
            data,
          });
        }).catch(err => {
          return this.error(text, err, reject);
        });
      });
    },

    page(id) {
      return new Promise((resolve, reject) => {
        this.question(`#web get ${this.vars.page_url}`).then(result => {
          console.log('KEYS', Object.keys(result.a.data.parse));
          return resolve({text:result.a.data.parse.text, html:result.a.data.parse.text, data: result.a.data.parse});
        }).catch(err => {
          return this.error(id, err, reject);
        });
      });
    },
  },

  methods: {
    ask(packet) {
      return new Promise((resolve, reject) => {
        this.func.summary(packet.q.text).then(summary => {
          if (summary) resolve(summary);
          return this.func.search(packet.q.text);
        }).catch(err => {
          return this.error(text, err, reject);
        });
      });
    },

    search(packet) {
      this.vars.current = packet.q.meta.params[1] || this.vars.current;
      this.vars.search_url = `${this.vars.api[this.vars.current]}${this.vars.search_str}${packet.q.text}`;
      return this.func.search(packet.q.text);
    },

    page(packet) {
      this.vars.current = packet.q.meta.params[1] || this.vars.current;
      this.vars.page_url = this.vars.api[this.vars.current] + this.vars.page_str + packet.q.text;
      return this.func.page(packet.q.text);
    },

    summary(packet) {
      return this.func.summary(packet.q.text);
    },

    uid(packet) {
      return Promise.resolve(this.uid());
    },

    status(packet) {
      return this.status();
    },

    help(packet) {
      return new Promise((resolve, reject) => {
        this.lib.help(packet.q.text, __dirname).then(help => {
          return this.question(`#feecting parse ${help}`);
        }).then(parsed => {
          return resolve({
            text: parsed.a.text,
            html: parsed.a.html,
            data: parsed.a.data,
          });
        }).catch(err => {
          return this.error(text, err, reject);
        });
      });
    }
  },
});
module.exports = WIKI

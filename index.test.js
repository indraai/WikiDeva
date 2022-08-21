// Copyright (c)2021 Quinn Michaels
// WIKIPEDIA test file

const {expect} = require('chai')
const wiki = require('./index.js');

describe(wiki.me.name, () => {
  beforeEach(() => {
    return wiki.init()
  });
  it('Check the SVARGA Object', () => {
    expect(wiki).to.be.an('object');
    expect(wiki).to.have.property('me');
    expect(wiki).to.have.property('vars');
    expect(wiki).to.have.property('listeners');
    expect(wiki).to.have.property('methods');
    expect(wiki).to.have.property('modules');
  });
})

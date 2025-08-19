const searchEngine = new SearchEngine({
    name: 'my-search-index',
    version: 1,
    fields: ['title', 'content', 'tags']
  });
  
  await searchEngine.initialize();
  await searchEngine.addDocuments([
    {
      title: 'Document 1',
      content: 'Search content example',
      tags: ['example', 'search']
    }
  ]);
  
  const results = await searchEngine.search('search', {
    fuzzy: true,
    maxResults: 5
  });
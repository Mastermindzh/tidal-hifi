function triggerInputEvent(element: HTMLElement) {
  const event = new Event('input', {
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(event);
}

function createTag(artistName: string) {
  const tag = document.createElement('div');
  tag.className = 'tags__tag';
  tag.textContent = artistName;
  tag.title = "Remove " + artistName;
  tag.tabIndex = 0;

  // Add click event to remove the tag
  tag.addEventListener('click', () => {
    const skippedArtistsTextarea = document.getElementById('skippedArtists') as HTMLTextAreaElement;
    const artists = skippedArtistsTextarea.value.split('\n').map(artist => artist.trim()).filter(artist => artist !== '');
    const updatedArtists = artists.filter(artist => artist !== artistName);
    skippedArtistsTextarea.value = updatedArtists.join('\n') + (updatedArtists.length > 0 ? '\n' : '');

    triggerInputEvent(skippedArtistsTextarea);
    updateTags();
  });

  tag.addEventListener('keypress', (event: Event) => {
    if ((event as KeyboardEvent).key === 'Enter' || (event as KeyboardEvent).key === ' ') {
      event.preventDefault();
      tag.click();
    }
  })

  return tag;
}

function skipArtist() {
  const artistInput = document.getElementById('add-artist') as HTMLInputElement;
  const skippedArtistsTextarea = document.getElementById('skippedArtists') as HTMLTextAreaElement;
  const artistName = artistInput.value.trim();
  if (artistName === '') return;

  // Clear input
  artistInput.value = '';

  // If the artist already exists, do nothing
  const existingArtists = skippedArtistsTextarea.value.split('\n').map(artist => artist.trim()).filter(artist => artist !== '');
  if (existingArtists.includes(artistName)) {
    return;
  }

  // Update textarea
  if (skippedArtistsTextarea.value && !skippedArtistsTextarea.value.endsWith("\n")) {
    skippedArtistsTextarea.value += '\n';
  }
  skippedArtistsTextarea.value += artistName + '\n';

  triggerInputEvent(skippedArtistsTextarea);
  updateTags();
}

function updateTags() {
  const artistTagsContainer = document.getElementById('artist-tags');
  const skippedArtistsTextarea = document.getElementById('skippedArtists') as HTMLTextAreaElement;
  const artists = skippedArtistsTextarea.value.split('\n').map(artist => artist.trim()).filter(artist => artist !== '');

  // Clear existing tags
  artistTagsContainer.innerHTML = '';

  // Create and append tags
  artists.forEach(artistName => {
    const tag = createTag(artistName);
    artistTagsContainer.appendChild(tag);
  });
}

function handleEnterKey(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault();
    skipArtist();
  }
}

document.getElementById('add-artist').addEventListener('keydown', handleEnterKey);
document.getElementById('skippedArtists').addEventListener("input", () => updateTags());
setTimeout(() => updateTags(), 100);

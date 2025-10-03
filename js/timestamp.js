function updateCurrentTime() {
    const currentTimeElement = document.getElementById('current-time');
    if (!currentTimeElement) return;

    const now = new Date();
    const formatted = now.toLocaleString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZoneName: 'short'
    });
    currentTimeElement.textContent = formatted;
}

setInterval(updateCurrentTime, 1000);
updateCurrentTime();

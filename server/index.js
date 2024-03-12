const measureBtn = document.getElementById('measureBtn');

console.log(measureBtn);

measureBtn.addEventListener('click', () => {
  fetch("http://localhost:3000", {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "text/html",
    },
    body: "hle",
  }).then(data => {
    console.log(data);
  });
})

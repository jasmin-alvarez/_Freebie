document.querySelector(".bid").addEventListener("click", function (){
    console.log('data id',  this.parentNode.getAttribute("data-id"))
    const id = this.parentNode.getAttribute("data-id")

    fetch("../bid", {
      method: "PUT",
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
      "id": id
      })
      }).then(response => {
            if (response.ok) {
              window.location.reload()
              return response.json()

              // Add some stylying to notify the client that item has been selected
            }
          })
        })


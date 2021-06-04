const chooseWinner = document.getElementsByClassName("ChooseWinner")
      
Array.from(chooseWinner).forEach(function(element) {
    element.addEventListener('click', function(e){

        console.log(this.parentNode.childNodes[3].childNodes[3].innerText)
        const id = this.parentNode.getAttribute("data-postId")  
        const name = this.parentNode.childNodes[3].childNodes[3].innerText  
    
        fetch("wonPost", {
            method: "PUT",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
            "postID": id,
            "name": name
            })
            }).then(response => {
                  if (response.ok) {
                    window.location.reload()
                    return response.json()
      
                    // Add some stylying to notify the client that item has been selected
                  }
                })
    
    });
});


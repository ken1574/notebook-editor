document.addEventListener('DOMContentLoaded', () => {
    const socket = io.connect('http://' + window.location.hostname + ':8000', { transports: ['websocket'] });
    const bottomBar  = document.querySelector('.bottom-bar');
    const createNotebookButton = document.querySelector('.create-notebook-button');
    const dashboardGrid = document.querySelector('.notebooks-grid.dashboard');
    const favouritesGrid = document.querySelector('.notebooks-grid.favourites-grid');
    const trashGrid = document.querySelector('.notebooks-grid.trash');
    const notifBanner = document.getElementById('notif');
    let notifText = document.getElementById('notif-text');

  
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    document.getElementById(`Dashboard-tab`).style.display = 'block';


    // Event delegation for toggling dropdowns | Parent element: bottomBar
    bottomBar.addEventListener('click', (event) => {
        if (event.target.closest('.more')) {
            console.log('... button clicked');
            const moreButton = event.target.closest('.more');
            const dropdown = moreButton.querySelector('.more-dropdown');
            if (dropdown) {
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            }
        }

        if (event.target.textContent.trim() === 'Edit') {
            console.log('Edit button clicked');
            const notebookCard = event.target.closest('.notebook-card');
            const model = document.getElementById('create-notebook-model');
            
            const form = model.querySelector('#create-notebook-form');
            const formType = form.querySelector('#form-type');
            const openImgBtn = form.querySelector('#open-img-ctn-btn');
            const saveBtn = form.querySelector('.create-notebook-button');
            const editCoverDiv = form.querySelector('#edit-cover');
            const editCoverDivImg = editCoverDiv.querySelector('img');
            const formTitle = form.querySelector('input[id="title"]');
            const formTopic = form.querySelector('select[id="topic"]');

            // Notebook form fields
            const notebookId = notebookCard.getAttribute('data-id'); 
            const notebookTitle = notebookCard.querySelector('p').textContent.trim();
            const notebookTopic = notebookCard.getAttribute('data-topic');
            const styles = window.getComputedStyle(notebookCard);
            const backgroundImage = styles.getPropertyValue('background-image'); 
            const url = backgroundImage.slice(4, -1).replace(/"/g, '');
            

            formType.textContent = 'Edit Notebook';
            saveBtn.textContent = 'Save';
            openImgBtn.style.display = 'none';
            editCoverDivImg.src = url;
            editCoverDiv.style.display = 'flex';
            formTitle.value = notebookTitle;
            formTopic.value = notebookTopic;
            model.classList.add('opened');
            
            saveBtn.removeEventListener('click', handleCreateClick);
            const handleEditClick = (event) => {
                event.preventDefault();
                let selectedCoverInput = form.querySelector('input[name="selectedCover"]:checked');
                if (!selectedCoverInput && uploadedCover) {
                    selectedCoverInput = uploadedCover;
                } else if (selectedCoverInput) {
                    selectedCoverInput = selectedCoverInput.value;
                }
                const coverValue = selectedCoverInput ? selectedCoverInput : url;
                console.log(coverValue);
                
                if (formTitle.value === '') {
                    alert('Please enter a title');
                    return;
                }

                const notebookData = {
                    id: notebookId,
                    new_title: formTitle.value,
                    new_topic: formTopic.value,
                    new_cover: coverValue
                };
                socket.emit('edit_notebook', notebookData);
                console.log("Emited 'edit_notebook'");
                saveBtn.removeEventListener('click', handleEditClick);
                saveBtn.addEventListener('click', handleCreateClick);
                closeModel();
            }
            saveBtn.addEventListener('click', handleEditClick);
        }
        
        // Delete button
        if (event.target.textContent.trim() === 'Delete') {
            console.log('Delete button clicked');
            const notebookCard = event.target.closest('.notebook-card');
            const notebookTitle = notebookCard.querySelector('p').textContent.trim();
            const notebookId = notebookCard.getAttribute('data-id'); 
        
            notebookCard.remove();
        
            socket.emit('delete_notebook', { 
                id: notebookId,
                title: notebookTitle 
            });
        }

        // Delete forever button
        if (event.target.textContent.trim() === 'Delete Forever') {
            console.log('Delete forever button clicked');
            const notebookCard = event.target.closest('.notebook-card');
            if (notebookCard) {
                const notebookTitle = notebookCard.querySelector('p').textContent.trim();
                const notebookId = notebookCard.getAttribute('data-id');

                notebookCard.remove();

                socket.emit('delete_notebook_forever', {
                    id: notebookId,
                    title: notebookTitle 
                });
            } else {
                console.error('Notebook card not found');
            }
        }

        // Restore button
        if (event.target.textContent.trim() === 'Restore') { 
            const notebookCard = event.target.closest('.notebook-card');
            const notebookId = notebookCard.getAttribute('data-id');
            notebookCard.remove();
            socket.emit('restore_notebook', notebookId);
        }

        // Favourites and Downloads
        if (event.target.getAttribute('data-button') === 'favourites') {
            console.log('Favourite button pressed.');
            const notebookCard = event.target.closest('.notebook-card');
            const notebookId = notebookCard.getAttribute('data-id');
            const creatorId = notebookCard.getAttribute('data-creator_id')
            const currentUserId = document.querySelector('.container').getAttribute('data-current_user_id');
            const favouritesImg = notebookCard.querySelector('.favourites img');
            let updateType;

            if (favouritesImg.src.includes('heart.png')) {
                console.log('Notebook favourited')
                updateType = 'increase';
            } else {
                updateType = 'decrease';
            }
            const notebookData = {
                id: notebookId,
                creatorId: creatorId,
                updateType: updateType
            }
            socket.emit('update_favourites', notebookData);
        }

        if (event.target.getAttribute('data-button') === 'downloads') {
            console.log('Download button pressed.');
            const notebookCard = event.target.closest('.notebook-card');
            const notebookId = notebookCard.getAttribute('data-id');
        }

    });

    // CREATE NOTEBOOK
    const handleCreateClick = (event) => {
        event.preventDefault(); // Prevent form submission
        const form = document.getElementById('create-notebook-form');
        let titleValue = form.querySelector('#title').value;
        const topicValue = form.querySelector('#topic').value;
        const selectedCoverInput = form.querySelector('input[name="selectedCover"]:checked');
        let coverValue = selectedCoverInput ? selectedCoverInput.value : 'none';

        if (coverValue === 'none' && uploadedCover) {
            coverValue = uploadedCover;
        }
        
        if (titleValue === '') {
            titleValue = "Untitled Document";
        }
               
        const notebookData = {
            title: titleValue,
            topic: topicValue,
            cover: coverValue
        };
        
        // Emit a socket event to update the backend (app.py) -> update the database
        socket.emit('create_notebook', notebookData);
        console.log("Emit 'create_notebook'");
        uploadedCover = null;
        closeModel(); 
    };
    createNotebookButton.addEventListener('click', handleCreateClick);

 
    // Delete all trash notebooks button
    const deleteAllButton = document.getElementById('delete-all-button');
    deleteAllButton.addEventListener('click', () => {
        console.log('Delete all notebooks button clicked');
        socket.emit('delete_all_notebooks_forever');
    });



    // Search bar
    document.getElementById('searchInput').addEventListener('input', function () {
        console.log("input detected")
        const filter = this.value.toLowerCase();
        const gridItems = document.querySelectorAll('.dashboard-tab .notebook-card');
    
        gridItems.forEach(item => {
            const itemTitle = item.getAttribute('data-title'); // Ensure this exists
            if (itemTitle && itemTitle.toLowerCase().includes(filter)) {
                item.removeAttribute("id", "hidden");
            } else {
                item.setAttribute("id", "hidden");
            }
        });
    });
    








    // ---------------------------- On socket events ----------------------------//
    // ----------------------- CREATE DASHBOARD NOTEBOOK ----------------------- //
    socket.on('notebook_created', (data) => {
        const { notebook, restore } = data
        const { id, creator_id, creator_username, title, topic, cover, favourites, favourited, downloads } = notebook; 
        const newNotebook = document.createElement("div");

        newNotebook.classList.add("notebook-card");
        newNotebook.setAttribute("data-id", id); 
        newNotebook.setAttribute("data-creator_id", creator_id);
        newNotebook.setAttribute("data-creator_username", creator_username);
        newNotebook.setAttribute("data-topic", title);
        newNotebook.setAttribute("data-topic", topic);
        newNotebook.setAttribute("data-favourited", favourited);
        newNotebook.style.backgroundImage = `url(${cover})`;
        let heartUrl;
        if (favourited) {
            heartUrl = "resources/images/icons/heart_filled.png";
        } else {
            heartUrl = "resources/images/icons/heart.png";
        }
        newNotebook.innerHTML = `
            <a class="anchor" href="/editor/${id}"></a>
            <div class="notebook-card-header">
                <p class="title">${title}</p>
                <div class="notebook-card-options">
                    <div data-button="favourites" class="favourites">
                        <img src=${heartUrl} alt="favourites">
                        <p>${favourites}</p>
                    </div>
                    <div data-button="downloads" class="downloads">
                        <img src="resources/images/icons/downloads.png" alt="downloads">
                        <p>${downloads}</p>
                    </div>
                    <div class="more">
                        <img src="resources/images/icons/more.png" alt="more">
                        <div class="more-dropdown" style="display: none;">
                            <a>Created by: ${creator_username}</a>
                            <a>Edit</a>
                            <a>Delete</a>
                        </div>
                    </div>
                </div>
            </div>`;
        dashboardGrid.appendChild(newNotebook);
        if (restore) {
            notifText.textContent = `Notebook '${title}' restored.`
        } else {
            newNotebook.classList.add("new-notebook");
            notifText.textContent = `Notebook '${title}' created.`
        }
        notifBanner.classList.add('show');
        setTimeout(() => {
            notifBanner.classList.remove('show');
        }, 2000);
        console.log(`Notebook '${title}' created`);
    });
    // --------------------------------------------------------------------- //


    // -------------------------- EDIT NOTEBOOK -------------------------- //

    socket.on('notebook_edited', (data) => {        
        const notebookCard = document.querySelector(`.notebook-card[data-id="${data.id}"]`);
        const notebookTitle = notebookCard.querySelector('p');
        notebookTitle.textContent = data.title;
        notebookCard.setAttribute("data-topic", data.title);
        notebookCard.setAttribute("data-topic", data.topic);
        notebookCard.style.backgroundImage = `url(${data.cover})`
        notifText.textContent = `Notebook '${data.title}' edited.`
        notifBanner.classList.add('show');
        setTimeout(() => {
            notifBanner.classList.remove('show');
        }, 2000);
        console.log(`Notebook edited`);
    });
    // --------------------------------------------------------------------- //


    // ----------------------- RENDER TRASH NOTEBOOK ----------------------- //
    socket.on('notebook_deleted', (data) => {
        const { id, creator_id, creator_username, title, topic, cover, favourites, favourited, downloads } = data; 
        const notebookCard = document.createElement("div");
        notebookCard.classList.add("notebook-card");
        notebookCard.setAttribute("data-id", id); 
        notebookCard.setAttribute("data-creator_id", creator_id);
        notebookCard.setAttribute("data-creator_username", creator_username);
        notebookCard.setAttribute("data-topic", title);
        notebookCard.setAttribute("data-topic", topic);
        notebookCard.setAttribute("data-favourited", favourited);
        notebookCard.style.backgroundImage = `url(${cover})`
        if (favourited) {
            heartUrl = "resources/images/icons/heart_filled.png";
        } else {
            heartUrl = "resources/images/icons/heart.png";
        }
        notebookCard.innerHTML = `
            <div class="notebook-card-header">
                <p class="title">${title}</p>
                <div class="notebook-card-options">
                    <div data-button="favourites" class="favourites">
                        <img src=${heartUrl} alt="favourites">
                        <p>${favourites}</p>
                    </div>
                    <div data-button="downloads" class="downloads">
                        <img src="resources/images/icons/downloads.png" alt="downloads">
                        <p>${downloads}</p>
                    </div>
                    <div class="more">
                        <img src="resources/images/icons/more.png" alt="more">
                        <div class="more-dropdown" style="display: none;">
                            <a>Created by: ${creator_username}</a>
                            <a>Restore</a>
                            <a>Delete Forever</a>
                        </div>
                    </div>
                </div>
            </div>`;
        trashGrid.appendChild(notebookCard);
        if (favourited) {
            favouritesGrid.querySelector(`.notebook-card[data-id="${id}"]`).remove();
        }
        notifText.textContent = `Notebook '${title}' moved to trash.`;
        notifBanner.classList.add('show');
        setTimeout(() => {
            notifBanner.classList.remove('show');
        }, 2000);
        console.log(`Notebook "${title}" marked as trash.`);

    });
    // --------------------------------------------------------------------- //

    socket.on('notebook_deleted_forever', (data) => {
        console.log(`Notebook "${data.title}" permanently deleted.`);
        notifText.textContent = `Notebook '${data.title}' permanently deleted.`;
        notifBanner.classList.add('show');
        setTimeout(() => {
            notifBanner.classList.remove('show');
        }, 2000);
        console.log(`Notebook '${data.title}' deleted forever`);
    });

    socket.on('all_notebooks_deleted_forever', () => {
        trashGrid.innerHTML = '';
        notifText.textContent = `All notebooks permanently deleted successfully.`;
        notifBanner.classList.add('show');
        setTimeout(() => {
            notifBanner.classList.remove('show');
        }, 2000);
        console.log('All notebooks permanently deleted');
    });

    socket.on('update_notebook_count', (data) => {
        const notebookCount = document.getElementById('notebook-count');
        notebookCount.innerHTML = data.notebookCount;
    })
    // --------------------------------  Update Favourites --------------------------------- //

    socket.on('favourites_updated', (data) => {
        const { notebook, updateType } = data
        const { id, creator_id, creator_username, title, topic, cover, favourites, favourited, downloads } = notebook;
        const notebookCard = document.querySelector(`.notebook-card[data-id="${id}"]`);
        const favouritesImg = notebookCard.querySelector('.favourites img');
        const favouritesNo = notebookCard.querySelector('.favourites p');


        if (updateType === 'increase') {
            favouritesImg.src = 'resources/images/icons/heart_filled.png';
            favouritesNo.textContent = favourites;
            const favNotebookCard = document.createElement("div");
            favNotebookCard.classList.add("notebook-card");
            favNotebookCard.setAttribute("data-id", id); 
            favNotebookCard.setAttribute("data-creator_id", creator_id);
            favNotebookCard.setAttribute("data-creator_username", creator_username);
            favNotebookCard.setAttribute("data-topic", title);
            favNotebookCard.setAttribute("data-topic", topic);
            favNotebookCard.setAttribute("data-favourited", favourited);
            favNotebookCard.style.backgroundImage = `url(${cover})`;
            favNotebookCard.innerHTML = `
            <div class="notebook-card-header">
                <p class="title">${title}</p>
                <div class="notebook-card-options">
                    <div data-button="favourites" class="favourites">
                        <img src="resources/images/icons/heart_filled.png" alt="favourites">
                        <p>${favourites}</p>
                    </div>
                    <div data-button="downloads" class="downloads">
                        <img src="resources/images/icons/downloads.png" alt="downloads">
                        <p>${downloads}</p>
                    </div>
                    <div class="more">
                        <img src="resources/images/icons/more.png" alt="more">
                        <div class="more-dropdown" style="display: none;">
                            <a>Created by: ${creator_username}</a>
                            <a>Restore</a>
                            <a>Delete Forever</a>
                        </div>
                    </div>
                </div>
            </div>`;
            favouritesGrid.appendChild(favNotebookCard);
            console.log(`Notebook "${title}" favourited`);
        } else {
            favouritesGrid.querySelector(`.notebook-card[data-id="${id}"]`).remove();
            favouritesImg.src = 'resources/images/icons/heart.png';  
            favouritesNo.textContent = favourites;
        }
    });
    // --------------------------- Notebook Upload Status Update --------------------------------- //
    socket.on('notebooks_upload_status', (status) => {
        console.log("Received event from server:", status);
        if (status === 'success') {
            notifText.textContent = `Notebooks uploaded successfully!`;
            console.log('success')
        } else {
            notifText.textContent = `An error has occurred.`;
        }
        notifBanner.classList.add('show');
            setTimeout(() => {
                notifBanner.classList.remove('show');
            }, 2000);
    });


    // --------------------------- Upload Cover Event ----------------------------- //
    globalThis.uploadedCover = null;
    document.getElementById("upload-cover-input").addEventListener("change", (event) => {
        const file = event.target.files[0]; 
        const imageContainerGrid = document.querySelector(".image-container-grid");
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                console.log("Image uploaded from PC");
                uploadedCover = e.target.result;
                imageContainerGrid.style.display = "none";

                // Unselects any previously selected cover
                document.querySelectorAll('input[name="selectedCover"]').forEach(radio => {
                    radio.checked = false;
                });

                document.getElementById("cover-preview").src = uploadedCover;
                document.getElementById("cover-preview").style.display = "block";
            };
            reader.readAsDataURL(file); // Convert file to data URL
        };
    });
    // --------------------------- Upload JSON Notebooks Event ----------------------------- //
    document.getElementById('upload_form').addEventListener('submit', function(event) {
        event.preventDefault();

        var fileInput = document.getElementById('notebooks_upload');
        var file = fileInput.files[0];
        
        if (file && file.type === 'application/json') {
            var reader = new FileReader();
            
            reader.onload = function(event) {
                var fileData = event.target.result;  // The base64 data of the file
                var fileName = file.name;
                
                // Emit the file upload event with the base64 file data
                socket.emit('upload_json', {
                    'file': fileData.split(',')[1],  // Extract the base64 part (without metadata)
                    'file_name': fileName
                });
            };
            
            reader.readAsDataURL(file);  // Read the file as a base64 string
        }
    });

    socket.on('notebooks_upload_status', function(data) {
        if (data.status === 'success') {
            notifText.textContent = 'Notebooks uploaded successfully!';
            console.log('Upload successful');
        } else {
            notifText.textContent = 'An error occurred during upload: ' + data.message;
            console.error(data.message || 'Unknown error');
        }

        const notebooks = data.notebooks_data;
        notebooks.forEach((notebook) => {
            const { id, creator_id, creator_username, title, topic, cover, favourites, favourited, downloads } = notebook; 
            const newNotebook = document.createElement("div");
            newNotebook.classList.add("notebook-card");
            newNotebook.setAttribute("data-id", id); 
            newNotebook.setAttribute("data-creator_id", creator_id);
            newNotebook.setAttribute("data-creator_username", creator_username);
            newNotebook.setAttribute("data-topic", title);
            newNotebook.setAttribute("data-topic", topic);
            newNotebook.setAttribute("data-favourited", favourited);
            newNotebook.style.backgroundImage = `url(${cover})`;
            let heartUrl;
            if (favourited) {
                heartUrl = "resources/images/icons/heart_filled.png";
            } else {
                heartUrl = "resources/images/icons/heart.png";
            }
            newNotebook.innerHTML = `
                <a class="anchor" href="/editor/${id}"></a>
                <div class="notebook-card-header">
                    <p class="title">${title}</p>
                    <div class="notebook-card-options">
                        <div data-button="favourites" class="favourites">
                            <img src=${heartUrl} alt="favourites">
                            <p>${favourites}</p>
                        </div>
                        <div data-button="downloads" class="downloads">
                            <img src="resources/images/icons/downloads.png" alt="downloads">
                            <p>${downloads}</p>
                        </div>
                        <div class="more">
                            <img src="resources/images/icons/more.png" alt="more">
                            <div class="more-dropdown" style="display: none;">
                                <a>Created by: ${creator_username}</a>
                                <a>Edit</a>
                                <a>Delete</a>
                            </div>
                        </div>
                    </div>
                </div>`;
            dashboardGrid.appendChild(newNotebook);
        });

        notifBanner.classList.add('show');
        setTimeout(() => {
            notifBanner.classList.remove('show');
        }, 2000);
    });

    // ------------------------------------------------------------------------------------- //
});

    







// Button onclick functions
function openModel() {
    document.getElementById('create-notebook-model').classList.add('opened');
}
function closeModel() {
    const form = model.querySelector('#create-notebook-form');
    document.getElementById('create-notebook-model').classList.remove('opened');
    form.querySelector('#form-type').textContent = "Create Notebook";
    form.querySelector('.create-notebook-button').textContent = "Create";
}

function showTab(tabId) {
    document.querySelectorAll('.sidebar button').forEach(button => {
        button.classList.remove('current-tab');
        if (button.textContent === tabId) {
            button.classList.add('current-tab');
        }
    })
    
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    document.getElementById(`${tabId}-tab`).style.display = 'block';
}

function closeModel() {
    document.getElementById('create-notebook-model').classList.remove('opened');
    document.getElementById('edit-cover').style.display = 'none';
    document.getElementById('open-img-ctn-btn').style.display = 'flex';
    document.getElementById('image-container').classList.remove('opened');
    document.getElementById('cover-preview').src = "";
    document.querySelector('.image-container-grid').style.display = 'grid';
    uploadedCover = null;
    const form = document.getElementById('create-notebook-form');
    form.querySelector('#form-type').textContent = "Create Notebook";
    form.querySelector('.create-notebook-button').textContent = "Create";
    form.reset();
}


function openImageContainer() {
    document.getElementById('image-container').classList.add('opened');
}
function closeImageContainer() {
    document.getElementById('image-container').classList.remove('opened');
    document.getElementById('open-img-ctn-btn').style.display = 'none';
    document.getElementById('edit-cover').style.display = 'flex';
    document.getElementById("cover-preview").style.display = "none";
    document.querySelector(".image-container-grid").style.display = 'grid';
    const form = document.getElementById('create-notebook-form');
    const cover_chosen = form.querySelector('input[name="selectedCover"]:checked');
    const cover_img = form.querySelector('.edit-cover img');
    if (cover_chosen) {
        cover_img.src = cover_chosen.value;
    } else if(uploadedCover) {
        cover_img.src = uploadedCover;
    } else {
        cover_img.src = ""
    }
}


document.addEventListener("DOMContentLoaded", () => {
    console.log("Editor loaded")
    const socket = io.connect('http://' + window.location.hostname + ':8000', { transports: ['websocket'] });
    const notebookId = document.querySelector(".container").getAttribute("data-id");
    const lastEditedSpan = document.querySelector(".last-edited span");
    let isDirty = false;
    let lastSavedTime = null;

    const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        ['link', 'image', 'video', 'formula'],
        [{ 'header': 1 }, { 'header': 2 }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'font': [] }],
        [{ 'align': [] }],
        ['clean']
    ];


    Quill.register('modules/imageResize', QuillResizeModule);
    const quill = new Quill('#editor', {
        modules: {
            imageResize: {}, 
            toolbar: toolbarOptions
        },
        theme: 'snow'
    });

    let notebookContents = document.querySelector(".container").getAttribute("data-contents");
    notebookContents = JSON.parse(notebookContents); 
    quill.setContents(JSON.parse(notebookContents), 'api');

    quill.on('text-change', () => {
        isDirty = true;
    });

    // Manually update quill delta with image attribute (resize image)
    quill.root.addEventListener("click", (event) => {
        if (event.target.tagName === "IMG") {
            console.log("Image clicked");
            const img = event.target;
    
            if (typeof ResizeObserver !== "undefined") {
                const observer = new ResizeObserver(entries => {
                    for (let entry of entries) {
                        const { width, height } = entry.contentRect;
    
                        // Ensure the image exists inside the Quill editor
                        const blot = Quill.find(img);
                        if (!blot) return;
    
                        const index = quill.getIndex(blot);
    
                        // Update the image size inside the Quill editor
                        quill.formatText(index, 1, {
                            width: `${width}px`,
                            height: `${height}px`
                        });
    
                        isDirty = true;
                    }
                });
    
                observer.observe(img);
            } else {
                console.warn("ResizeObserver is not supported in this browser.");
            }
        }
    });
    

    function updateLastEdited() {
        lastSavedTime = new Date();
        const lastSavedTimeString = lastSavedTime.toLocaleString()
        lastEditedSpan.textContent = lastSavedTimeString;
        return lastSavedTimeString;
    }

    function saveNotebook() {
        if (!isDirty) return;
        const contents = quill.getContents(); 
        const notebookData = {
            id: notebookId,
            contents: contents
        };    
        socket.emit('save_notebook_contents', notebookData);
        isDirty = false;
    }

    // Periodically autosaves notebook
    setInterval(() => {
        saveNotebook();
    }, 1000);

    socket.on("save_status", (status) => {
        if (status === "success") {
            const notebookData = {
                id: notebookId,
                lastSaved: updateLastEdited()
            }
            socket.emit('update_last_saved', notebookData)
        } else {
            console.log("Notebook save error")
        }
    });
});

// static/js/index.js

window.onload = function () {
    // Show loading indicator
    document.getElementById('loading').style.display = 'flex';

    // Fetch all XML data concurrently
    Promise.all([
        fetch('/static/data/authors.xml').then(response => response.text()),
        fetch('/static/data/publishers.xml').then(response => response.text()),
        fetch('/static/data/books.xml').then(response => response.text()),
        fetch('/static/data/genres.xml').then(response => response.text()) // Fetch genres.xml
    ]).then(([authorsData, publishersData, booksData, genresData]) => {
        const parser = new DOMParser();

        // Parse authors.xml
        const authorsDoc = parser.parseFromString(authorsData, "application/xml");
        const authors = {};
        const authorsList = authorsDoc.getElementsByTagName('Author');
        for (let i = 0; i < authorsList.length; i++) {
            const author = authorsList[i];
            const id = author.getAttribute('id');
            const name = author.getElementsByTagName('Name')[0].textContent;
            authors[id] = name;
        }

        // Parse publishers.xml
        const publishersDoc = parser.parseFromString(publishersData, "application/xml");
        const publishers = {};
        const publishersList = publishersDoc.getElementsByTagName('Publisher');
        for (let i = 0; i < publishersList.length; i++) {
            const publisher = publishersList[i];
            const id = publisher.getAttribute('id');
            const name = publisher.getElementsByTagName('Name')[0].textContent;
            publishers[id] = name;
        }

        // Parse genres.xml
        const genresDoc = parser.parseFromString(genresData, "application/xml");
        const genres = {};
        const genresList = genresDoc.getElementsByTagName('Genre');
        for (let i = 0; i < genresList.length; i++) {
            const genre = genresList[i];
            const id = genre.getAttribute('id');
            const name = genre.getElementsByTagName('Name')[0].textContent;
            genres[id] = name;
        }

        // Parse books.xml
        const booksDoc = parser.parseFromString(booksData, "application/xml");
        const books = booksDoc.getElementsByTagName('Book');
        const bookTable = document.getElementById('book-table');
        const borrowBookSelect = document.getElementById('borrowBookId');
        const returnBookSelect = document.getElementById('returnBookId');

        // Retrieve borrowing data from LocalStorage
        const borrowingData = JSON.parse(localStorage.getItem('borrowingData')) || {};

        // Clear existing options
        borrowBookSelect.innerHTML = '<option value="">Select a Book</option>';
        returnBookSelect.innerHTML = '<option value="">Select a Book</option>';

        for (let i = 0; i < books.length; i++) {
            const book = books[i];
            const id = book.getAttribute('id');
            const title = book.getElementsByTagName('Title')[0].textContent;

            // Fetch Author
            const authorElement = book.getElementsByTagName('Author')[0];
            const authorHref = authorElement.getAttribute('xlink:href');
            const authorId = authorHref.split('#')[1];
            const authorName = authors[authorId] || 'Unknown';

            // Fetch Publisher
            const publisherElement = book.getElementsByTagName('Publisher')[0];
            const publisherHref = publisherElement.getAttribute('xlink:href');
            const publisherId = publisherHref.split('#')[1];
            const publisherName = publishers[publisherId] || 'Unknown';

            // Fetch Genre
            const genreElement = book.getElementsByTagName('Genre')[0];
            const genreHref = genreElement.getAttribute('xlink:href');
            const genreId = genreHref.split('#')[1];
            const genreName = genres[genreId] || 'Unknown';

            // Create table row for each book
            const row = document.createElement('tr');
            row.setAttribute('data-id', id);

            // Check if book is borrowed
            const isBorrowed = borrowingData[id] ? true : false;

            // Populate row with book details, including genre
            row.innerHTML = `<td>${id}</td>
                             <td><a href="viewer.html?file=books.xml&id=${id}" target="_blank">${title}</a></td>
                             <td><a href="viewer.html?file=authors.xml&id=${authorId}" target="_blank">${authorName}</a></td>
                             <td><a href="viewer.html?file=publishers.xml&id=${publisherId}" target="_blank">${publisherName}</a></td>
                             <td><a href="viewer.html?file=genres.xml&id=${genreId}" target="_blank">${genreName}</a></td>
                             <td>${isBorrowed ? borrowingData[id].borrowerName : ''}</td>
                             <td>${isBorrowed ? borrowingData[id].borrowDate : ''}</td>
                             <td>${isBorrowed ? borrowingData[id].returnDate : ''}</td>
                             <td>${isBorrowed ? 'Borrowed' : 'Present'}</td>`;
            if (isBorrowed) {
                row.classList.add('borrowed');
            }
            bookTable.appendChild(row);

            // Populate the appropriate dropdown
            if (!isBorrowed) {
                // Add book to Borrow dropdown
                const option = document.createElement('option');
                option.value = id;
                option.textContent = `${id} - ${title}`;
                borrowBookSelect.appendChild(option);
            } else {
                // Add book to Return dropdown
                const returnOption = document.createElement('option');
                returnOption.value = id;
                returnOption.textContent = `${id} - ${title}`;
                returnBookSelect.appendChild(returnOption);
            }
        }
    }).catch(error => {
        console.error('Error fetching or parsing XML files:', error);
    }).finally(() => {
        // Hide loading indicator
        document.getElementById('loading').style.display = 'none';
    });

    // Initialize the graph network variable
    let network = null;

    // Function to fetch and render graph
    function renderGraph() {
        document.getElementById('loading').style.display = 'flex';
        fetch('/api/ontology_graph')
            .then(response => response.json())
            .then(data => {
                const nodes = new vis.DataSet(data.nodes.map(node => ({
                    id: node.id,
                    label: node.label,
                    group: node.group || 'Other',  // Assign group for styling
                    title: `Group: ${node.group || 'Other'}` // Tooltip
                })));

                const edges = new vis.DataSet(data.edges.map(edge => ({
                    from: edge.from,
                    to: edge.to,
                    label: edge.label,
                    arrows: 'to',
                    smooth: { type: 'cubicBezier', forceDirection: 'horizontal', roundness: 0.4 }
                })));

                const container = document.getElementById('network');
                const graphData = {
                    nodes: nodes,
                    edges: edges
                };
                const options = {
                    layout: {
                        hierarchical: false
                    },
                    edges: {
                        arrows: {
                            to: { enabled: true, scaleFactor: 0.5 }
                        },
                        font: {
                            align: 'top'
                        }
                    },
                    physics: {
                        enabled: true,
                        stabilization: {
                            iterations: 1000
                        }
                    },
                    interaction: {
                        hover: true,
                        navigationButtons: true,
                        keyboard: true
                    },
                    groups: {
                        Book: { color: { background: '#FF5733' }, shape: 'box' },
                        Author: { color: { background: '#33FF57' }, shape: 'ellipse' },
                        Publisher: { color: { background: '#3357FF' }, shape: 'diamond' },
                        Genre: { color: { background: '#F1C40F' }, shape: 'hexagon' },
                        Library: { color: { background: '#9B59B6' }, shape: 'star' },
                        Other: { color: { background: '#7F8C8D' }, shape: 'circle' }
                    }
                };

                network = new vis.Network(container, graphData, options);

                // Add click event to nodes
                network.on("click", function (params) {
                    if (params.nodes.length > 0) {
                        const nodeId = params.nodes[0];
                        // Determine the type of node to navigate appropriately
                        const nodeGroup = data.nodes.find(node => node.id === nodeId)?.group || 'Other';
                        let file = '';
                        let id = '';
                        if (nodeGroup === 'Book') {
                            file = 'books.xml';
                            id = nodeId.split('#')[1]; // Assuming ID format like http://example.org/library#b1
                        } else if (nodeGroup === 'Author') {
                            file = 'authors.xml';
                            id = nodeId.split('#')[1];
                        } else if (nodeGroup === 'Publisher') {
                            file = 'publishers.xml';
                            id = nodeId.split('#')[1];
                        } else if (nodeGroup === 'Genre') {
                            file = 'genres.xml';
                            id = nodeId.split('#')[1];
                        } else if (nodeGroup === 'Library') {
                            // Handle library node click if necessary
                            return;
                        } else {
                            return;
                        }
                        window.open(`viewer.html?file=${file}&id=${id}`, '_blank');
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching graph data:', error);
            })
            .finally(() => {
                document.getElementById('loading').style.display = 'none';
            });
    }

    // Handle Toggle Switch
    document.getElementById('viewToggle').addEventListener('change', function () {
        const tableView = document.getElementById('tableView');
        const networkView = document.getElementById('network');

        if (this.checked) {
            // Switch to Graph View
            tableView.style.display = 'none';
            networkView.style.display = 'block';
            // Render graph if not already rendered
            if (!network) {
                renderGraph();
            } else {
                network.redraw();
            }
        } else {
            // Switch to Table View
            tableView.style.display = 'table';
            networkView.style.display = 'none';
        }
    });

    // Handle Borrow Form Submission
    document.getElementById('borrowForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const bookId = document.getElementById('borrowBookId').value;
        const borrowerName = document.getElementById('borrowerName').value.trim();
        const borrowDate = document.getElementById('borrowDate').value;

        if (!bookId || !borrowerName || !borrowDate) {
            alert('Please fill in all fields.');
            return;
        }

        // Confirmation Dialog
        if (!confirm(`Are you sure you want to borrow Book ID ${bookId}?`)) {
            return;
        }

        const row = document.querySelector(`#book-table tr[data-id="${bookId}"]`);
        if (row) {
            const currentState = row.cells[8].textContent;
            if (currentState === 'Borrowed') {
                alert('This book is already borrowed.');
                return;
            }

            const returnDate = new Date(borrowDate);
            returnDate.setMonth(returnDate.getMonth() + 3); // Set the return date 3 months later

            // Update the table
            row.cells[5].textContent = borrowerName;
            row.cells[6].textContent = borrowDate;
            row.cells[7].textContent = returnDate.toISOString().split('T')[0]; // Format the date as YYYY-MM-DD
            row.cells[8].textContent = 'Borrowed';
            row.classList.add('borrowed');

            // Save borrowing details to LocalStorage
            const borrowingData = JSON.parse(localStorage.getItem('borrowingData')) || {};
            borrowingData[bookId] = {
                borrowerName: borrowerName,
                borrowDate: borrowDate,
                returnDate: returnDate.toISOString().split('T')[0]
            };
            localStorage.setItem('borrowingData', JSON.stringify(borrowingData));

            // Remove the borrowed book from Borrow Form dropdown
            const borrowBookSelect = document.getElementById('borrowBookId');
            const optionToRemove = borrowBookSelect.querySelector(`option[value="${bookId}"]`);
            if (optionToRemove) {
                optionToRemove.remove();
            }

            // Add the borrowed book to Return Form dropdown
            const returnBookSelect = document.getElementById('returnBookId');
            const newReturnOption = document.createElement('option');
            newReturnOption.value = bookId;
            newReturnOption.textContent = `${bookId} - ${row.cells[1].textContent}`;
            returnBookSelect.appendChild(newReturnOption);

            // Clear the form
            document.getElementById('borrowForm').reset();

            alert(`Book ID ${bookId} has been successfully borrowed.`);

            // Optionally, update the graph view if it's active
            if (document.getElementById('viewToggle').checked && network) {
                network.redraw();
            }
        } else {
            alert('No book found with that ID.');
        }
    });

    // Handle Return Form Submission
    document.getElementById('returnForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const bookId = document.getElementById('returnBookId').value;
        const returnDateInput = document.getElementById('returnDate').value;

        if (!bookId || !returnDateInput) {
            alert('Please fill in all fields.');
            return;
        }

        // Confirmation Dialog
        if (!confirm(`Are you sure you want to return Book ID ${bookId}?`)) {
            return;
        }

        const row = document.querySelector(`#book-table tr[data-id="${bookId}"]`);
        if (row) {
            const currentState = row.cells[8].textContent;
            if (currentState !== 'Borrowed') {
                alert('This book is not currently borrowed.');
                return;
            }

            // Update the table to clear borrowing details
            row.cells[5].textContent = '';
            row.cells[6].textContent = '';
            row.cells[7].textContent = '';
            row.cells[8].textContent = 'Present';
            row.classList.remove('borrowed');

            // Update LocalStorage
            const borrowingData = JSON.parse(localStorage.getItem('borrowingData')) || {};
            if (borrowingData[bookId]) {
                borrowingData[bookId].returnDate = returnDateInput; // Optionally update the return date
                // Remove the entry to indicate the book is returned
                delete borrowingData[bookId];
                localStorage.setItem('borrowingData', JSON.stringify(borrowingData));
            }

            // Remove the returned book from Return Form dropdown
            const returnBookSelect = document.getElementById('returnBookId');
            const optionToRemove = returnBookSelect.querySelector(`option[value="${bookId}"]`);
            if (optionToRemove) {
                optionToRemove.remove();
            }

            // Add the returned book back to Borrow Form dropdown
            const borrowBookSelect = document.getElementById('borrowBookId');
            const newBorrowOption = document.createElement('option');
            newBorrowOption.value = bookId;
            newBorrowOption.textContent = `${bookId} - ${row.cells[1].textContent}`;
            borrowBookSelect.appendChild(newBorrowOption);

            // Clear the form
            document.getElementById('returnForm').reset();

            alert(`Book ID ${bookId} has been successfully returned.`);

            // Optionally, update the graph view if it's active
            if (document.getElementById('viewToggle').checked && network) {
                network.redraw();
            }
        } else {
            alert('No book found with that ID.');
        }
    });

    // Clear borrowing data from localStorage
    document.getElementById('clearDataBtn').addEventListener('click', function () {
        if (confirm('Are you sure you want to clear all borrowing data? This action cannot be undone.')) {
            localStorage.removeItem('borrowingData'); // Only remove borrowing data
            location.reload(); // Reload the page after clearing the data
        }
    });
};

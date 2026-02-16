/* --- PiCom.com Main Script (Final Version: YouTube Style & AJAX & Edit/Delete Fixes) --- */

// --- [Global Scope] Slideshow Functions ---
let slideIndex = 1;

window.plusSlides = function(n) {
    showSlides(slideIndex += n);
}

window.showSlides = function(n) {
    let i;
    let slides = document.getElementsByClassName("mySlides");
    if (!slides || slides.length === 0) return; 
    
    if (n > slides.length) {slideIndex = 1}
    if (n < 1) {slideIndex = slides.length}
    
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    slides[slideIndex-1].style.display = "flex";
}


document.addEventListener('DOMContentLoaded', () => {
    
    // Component Guide 링크 강제 연결
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.textContent.trim() === 'Component Guide') {
            item.href = 'component-guide.html';
            item.addEventListener('click', (e) => {
                const currentHref = item.getAttribute('href');
                if (!currentHref || currentHref === '#' || currentHref === '') {
                    e.preventDefault();
                    window.location.href = 'component-guide.html';
                }
            });
        }
    });

    let auth;
    let db;
    let storage; 
    let pageScriptsRun = false; 
    let currentUserIsAdmin = false;
    
    // [Global State for Reply Mode]
    let activeReplyTarget = null; // { id: string, author: string }

    // [Pagination Config]
    const POSTS_PER_PAGE = 10; 
    const PAGE_GROUP_SIZE = 5; 
    
    const paginationState = {
        reviews: { page: 1, allDocs: [], totalPages: 0, loaded: false }, 
        errors: { page: 1, allDocs: [], totalPages: 0, loaded: false },
        notices: { page: 1, allDocs: [], totalPages: 0, loaded: false }
    };

    const adminPaginationState = {
        pending: { page: 1, allDocs: [], totalPages: 0, loaded: false },
        reviewed: { page: 1, allDocs: [], totalPages: 0, loaded: false },
        deleted: { page: 1, allDocs: [], totalPages: 0, loaded: false }
    };

    const popupPaginationState = {
        saved: { page: 1, allDocs: [], totalPages: 0, loaded: false },
        post: { page: 1, allDocs: [], totalPages: 0, loaded: false }
    };
    
    // 1. Initialize Firebase Services
    try {
        auth = firebase.auth(); 
        db = firebase.firestore();
        storage = firebase.storage(); 
        
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .catch(err => console.warn('Could not set auth persistence:', err));

        if(document.getElementsByClassName("mySlides").length > 0) {
            showSlides(1);
        }

    } catch (e) {
        console.error("Firebase initialization failed!", e);
        return; 
    }
    
    // --- 2. Auth State Listener ---
    auth.onAuthStateChanged(user => {
        const navLoginLink = document.getElementById('nav-login-link');
        const navProfileUI = document.getElementById('nav-profile-ui');
        const navLogoutLink = document.getElementById('nav-logout-link'); 
        const adminOption = document.getElementById('admin-notice-option');
        const navAdminLink = document.getElementById('nav-admin-link'); 
        
        const isProtectedPage = document.documentElement.classList.contains('protected-page');
        const isLoggedIn = !!user; 

        const initPage = (loggedInUser) => {
            if (!pageScriptsRun) {
                pageScriptsRun = true;
                runPageSpecificScripts(loggedInUser); 
            }
        };

        if (isLoggedIn) {
            if (navLoginLink) navLoginLink.style.display = 'none';
            if (navProfileUI) navProfileUI.style.display = 'flex'; 
            if (navLogoutLink) navLogoutLink.style.display = 'block'; 
            
            const nicknameElement = document.getElementById('profile-nickname-text');
            if (nicknameElement) {
                nicknameElement.textContent = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
            }
            
            db.collection("roles").doc("admin_users").get()
                .then(doc => {
                    currentUserIsAdmin = doc.exists && doc.data().uids && doc.data().uids.includes(user.uid);
                })
                .catch(error => {
                    currentUserIsAdmin = false;
                })
                .finally(() => {
                    if (adminOption) adminOption.style.display = currentUserIsAdmin ? 'block' : 'none';
                    if (navAdminLink) navAdminLink.style.display = currentUserIsAdmin ? 'block' : 'none'; 
                    initPage(user); 
                });
        } else {
            if (navLoginLink) navLoginLink.style.display = 'inline-flex'; 
            if (navProfileUI) navProfileUI.style.display = 'none';
            if (navLogoutLink) navLogoutLink.style.display = 'none';
            if (adminOption) adminOption.style.display = 'none';
            if (navAdminLink) navAdminLink.style.display = 'none'; 
            currentUserIsAdmin = false; 
            
            if (isProtectedPage) {
                alert('You must be logged in to access this page.');
                window.location.href = 'login.html';
                return; 
            } else {
                 initPage(null);
            }
        }
    });
    
    // --- 3. General Event Listeners ---
    const logoutLink = document.getElementById('nav-logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault(); 
            auth.signOut().then(() => {
                alert('You have been logged out.'); 
                window.location.href = 'Index.html';
            });
        });
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        // ... (CapsLock logic omitted for brevity, same as before) ...
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            auth.signInWithEmailAndPassword(loginForm.email.value, loginForm.password.value)
                .then(userCredential => {
                    alert('Login successful!'); 
                    window.location.href = 'Index.html';
                }).catch(error => alert('Login failed: ' + error.message));
        });
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = signupForm.username.value;
            const email = signupForm.email.value;
            const password = signupForm.password.value;
            const confirmPassword = signupForm['confirm-password'].value;

            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                return;
            }

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    return user.updateProfile({ displayName: username });
                })
                .then(() => {
                    alert('Sign up successful! Logging you in...');
                    window.location.href = 'Index.html';
                })
                .catch((error) => {
                    console.error("Signup Error:", error);
                    alert('Sign up failed: ' + error.message);
                });
        });
    }

    const googleLoginBtn = document.getElementById('google-login-btn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
                .then(() => { alert('Google Login successful!'); window.location.href = 'Index.html'; })
                .catch(error => alert('Google login failed: ' + error.message));
        });
    }

    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = forgotPasswordForm.email.value;
            auth.sendPasswordResetEmail(email)
                .then(() => {
                    alert('Password reset email sent! Check your inbox.');
                    window.location.href = 'login.html';
                })
                .catch(error => {
                    console.error('Password Reset Error:', error);
                    alert('Error sending reset email. ' + error.message);
                });
        });
    }

    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (hamburgerBtn && mobileMenu) {
        hamburgerBtn.addEventListener('click', () => { mobileMenu.classList.toggle('active'); });
    }

    // --- 4. Page Specific Logic Runner ---
    function runPageSpecificScripts(user) {
        
        // [Client Popup Logic]
        if (document.getElementById('site-popup')) {
            checkAndShowPopup();
        }

        // --- [Search & Autocomplete Logic] ---
        const searchInput = document.getElementById('community-search-input');
        const suggestionBox = document.getElementById('search-suggestions');
        const keywords = [
            "ram", "cpu", "gpu", "motherboard", "review", "error", "boot", 
            "screen", "blue screen", "install", "windows", "ssd", "hdd", 
            "case", "cooler", "overclock", "fps", "lag", "mouse", "keyboard",
            "intel", "amd", "nvidia", "rtx", "gtx", "ryzen"
        ];

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const keyword = e.target.value.toLowerCase().trim();
                const posts = document.querySelectorAll('.post-card');
                
                posts.forEach(post => {
                    const titleElement = post.querySelector('.post-title');
                    const excerptElement = post.querySelector('.post-excerpt');
                    const title = titleElement ? titleElement.textContent.toLowerCase() : '';
                    const excerpt = excerptElement ? excerptElement.textContent.toLowerCase() : '';

                    if (title.includes(keyword) || excerpt.includes(keyword)) {
                        post.style.display = 'block';
                    } else {
                        post.style.display = 'none';
                    }
                });

                if (suggestionBox) {
                    suggestionBox.innerHTML = '';
                    if (keyword.length === 0) {
                        suggestionBox.style.display = 'none';
                        return;
                    }
                    const matches = keywords.filter(word => word.includes(keyword));
                    if (matches.length > 0) {
                        matches.forEach(match => {
                            const div = document.createElement('div');
                            div.className = 'suggestion-item';
                            const highlighted = match.replace(keyword, `<span class="match-highlight">${keyword}</span>`);
                            div.innerHTML = highlighted;
                            div.addEventListener('click', () => {
                                searchInput.value = match;
                                suggestionBox.style.display = 'none';
                                searchInput.dispatchEvent(new Event('input'));
                            });
                            suggestionBox.appendChild(div);
                        });
                        suggestionBox.style.display = 'block';
                    } else {
                        suggestionBox.style.display = 'none';
                    }
                }
            });

            document.addEventListener('click', (e) => {
                if (suggestionBox && !searchInput.contains(e.target) && !suggestionBox.contains(e.target)) {
                    suggestionBox.style.display = 'none';
                }
            });
        }

        // --- [Sort Buttons Logic] ---
        const sortBtns = document.querySelectorAll('.sort-btn');
        if (sortBtns.length > 0) {
            sortBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    sortBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    const activePane = document.querySelector('.community-tab-pane.active');
                    if (!activePane) return;

                    const posts = Array.from(activePane.querySelectorAll('.post-card'));
                    const sortType = btn.dataset.sort;

                    posts.sort((a, b) => {
                        const titleA = a.querySelector('.post-title').innerText.toLowerCase();
                        const titleB = b.querySelector('.post-title').innerText.toLowerCase();
                        const dateTextA = a.querySelector('.post-meta')?.innerText.split('·')[1]?.trim() || '';
                        const dateTextB = b.querySelector('.post-meta')?.innerText.split('·')[1]?.trim() || '';
                        const dateA = new Date(dateTextA).getTime() || 0;
                        const dateB = new Date(dateTextB).getTime() || 0;
                        const likeA = parseInt(a.querySelector('.recommend-count')?.innerText || '0');
                        const likeB = parseInt(b.querySelector('.recommend-count')?.innerText || '0');

                        if (sortType === 'date') return dateB - dateA; 
                        if (sortType === 'az') return titleA.localeCompare(titleB);
                        if (sortType === 'za') return titleB.localeCompare(titleA);
                        if (sortType === 'recommend') return likeB - likeA;
                        return 0;
                    });

                    posts.forEach(post => activePane.appendChild(post));
                    const pagination = activePane.querySelector('.pagination-controls');
                    if (pagination) activePane.appendChild(pagination);
                });
            });
        }

        // [Admin Page Logic]
        if (document.getElementById('admin-reports-container')) {
            if (!currentUserIsAdmin) {
                alert("Access Denied. You are not an administrator.");
                window.location.href = 'Index.html';
                return; 
            }
            const params = new URLSearchParams(window.location.search);
            if(params.get('tab') === 'reports') {
                const reportsBtn = document.querySelector("button[onclick*='reports']");
                if(reportsBtn) reportsBtn.click();
            }
            setupAdminPopupManager(); 
            loadAdminReports('pending');
            setupAdminReportFilters(); 
        }
        
        if (document.querySelector('.community-tab-link')) {
            loadPosts('reviews', user, 'init').catch(console.error); 
            const communityTabs = document.querySelectorAll('.community-tab-link');
            const communityPanes = document.querySelectorAll('.community-tab-pane');
            communityTabs.forEach(clickedTab => {
                if (clickedTab.classList.contains('write-btn')) return;
                clickedTab.addEventListener('click', (e) => {
                    e.preventDefault();
                    communityTabs.forEach(tab => tab.classList.remove('active'));
                    communityPanes.forEach(content => content.classList.remove('active'));
                    clickedTab.classList.add('active');
                    const category = clickedTab.dataset.tab; 
                    const contentId = 'tab-' + category; 
                    const activeContent = document.getElementById(contentId);
                    if (activeContent) {
                        activeContent.classList.add('active');
                        loadPosts(category, user, 'init').catch(console.error); 
                        if (searchInput) searchInput.value = '';
                    }
                });
            });
        }
        
        if (document.getElementById('post-detail-container')) loadPostDetail(user);
        
        const writePostForm = document.getElementById('write-post-form');
        if (writePostForm) {
            const urlParams = new URLSearchParams(window.location.search);
            const postId = urlParams.get('id');
            const isEditMode = !!postId; 
            const submitButton = writePostForm.querySelector('button[type="submit"]');
            const fileInput = document.getElementById('post-image');
            const imagePreview = document.getElementById('image-preview');
            const uploadProgress = document.getElementById('upload-progress');
            let selectedFile = null;

            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    selectedFile = e.target.files[0];
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        imagePreview.innerHTML = `<img src="${event.target.result}" alt="Image preview">`;
                    };
                    reader.readAsDataURL(selectedFile);
                } else {
                    selectedFile = null;
                    imagePreview.innerHTML = '';
                }
            });

            if (isEditMode) {
                document.querySelector('.page-title').textContent = 'Edit Post';
                submitButton.textContent = 'Update Post';
                fileInput.disabled = true; 
                fileInput.parentElement.querySelector('.form-tags-hint').textContent = 'Image cannot be changed in Edit mode.';

                db.collection("posts").doc(postId).get()
                    .then(doc => {
                        if (doc.exists) {
                            const post = doc.data();
                            if (post.authorId !== user.uid) {
                                alert("You do not have permission to edit this post.");
                                window.location.href = 'community.html';
                                return;
                            }
                            writePostForm['post-title'].value = post.title || '';
                            writePostForm['post-category'].value = post.category || '';
                            writePostForm['post-tags'].value = (post.tags || []).join(', ');
                            writePostForm['post-content'].value = post.content || '';
                            if (post.imageUrl) {
                                imagePreview.innerHTML = `<img src="${post.imageUrl}" alt="Current image">`;
                            }
                        } else {
                            alert("Post not found.");
                            window.location.href = 'community.html';
                        }
                    })
                    .catch(error => {
                        console.error("Error fetching post data: ", error);
                        alert("Error loading post data.");
                        window.location.href = 'community.html';
                    });
            }

            writePostForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const postData = {
                    title: writePostForm['post-title'].value,
                    category: writePostForm['post-category'].value,
                    tagsInput: writePostForm['post-tags'].value,
                    content: writePostForm['post-content'].value
                };

                submitButton.disabled = true;

                if (isEditMode || !selectedFile) {
                    submitPostToFirestore(null, postData, user, isEditMode, postId);
                } else {
                    uploadProgress.style.display = 'block'; 
                    const filePath = `posts/${user.uid}/${Date.now()}_${selectedFile.name}`;
                    const fileRef = storage.ref(filePath);
                    const uploadTask = fileRef.put(selectedFile);
                    
                    uploadTask.on('state_changed', 
                        (snapshot) => {}, 
                        (error) => {
                            console.error("File upload error: ", error);
                            alert("Error uploading file: " + error.message);
                            uploadProgress.style.display = 'none';
                            submitButton.disabled = false;
                        }, 
                        () => {
                            uploadTask.snapshot.ref.getDownloadURL()
                                .then(downloadURL => {
                                    submitPostToFirestore(downloadURL, postData, user, isEditMode, postId);
                                })
                                .catch(error => {
                                    console.error("Error getting download URL: ", error);
                                    alert("Error getting file URL: " + error.message);
                                    submitButton.disabled = false;
                                    uploadProgress.style.display = 'none';
                                });
                        }
                    );
                }
            });
        }
        
        const profileTabs = document.querySelectorAll('.profile-nav-link');
        const profileContents = document.querySelectorAll('.profile-tab-content');
        if (profileTabs.length > 0) {
            const tabMap = {
                'profile-tab-favorites': 'profile-content-favorites',
                'profile-tab-history': 'profile-content-history',
                'profile-tab-edit': 'profile-content-edit',
                'profile-tab-password': 'profile-content-password'
            };
            profileTabs.forEach(clickedTab => {
                clickedTab.addEventListener('click', (e) => {
                    e.preventDefault();
                    profileTabs.forEach(tab => tab.classList.remove('active'));
                    profileContents.forEach(content => content.classList.remove('active'));
                    clickedTab.classList.add('active');
                    const contentId = tabMap[clickedTab.id];
                    if (contentId) {
                        const activeContent = document.getElementById(contentId);
                        if (activeContent) {
                            activeContent.classList.add('active');
                        }
                    }
                });
            });
        }

    } // End of runPageSpecificScripts

    // --- 5. Helper Functions ---
    function submitPostToFirestore(imageUrl, postData, user, isEditMode, postId) {
        const { title, category, tagsInput, content } = postData;
        const submitButton = document.querySelector('#write-post-form button[type="submit"]');
        
        if (title.trim() === '' || category === '' || content.trim() === '') {
            alert('Please fill out the Title, Category, and Content fields.');
            if (submitButton) submitButton.disabled = false;
            return;
        }
        if (category === 'notices' && !currentUserIsAdmin) {
            alert('You do not have permission to post notices.');
            if (submitButton) submitButton.disabled = false;
            return;
        }
        const tagsArray = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0); 
        const excerpt = content.substring(0, 150) + (content.length > 150 ? '...' : '');

        if (isEditMode) {
            const updatedData = { title: title, category: category, content: content, excerpt: excerpt, tags: tagsArray };
            db.collection("posts").doc(postId).update(updatedData)
                .then(() => {
                    alert('Post updated successfully!'); window.location.href = `post-detail.html?id=${postId}`;
                })
                .catch(error => {
                    console.error("Error updating post: ", error); alert('Error updating post: ' + error.message);
                    if (submitButton) submitButton.disabled = false;
                });
        } else {
            const newPost = {
                title: title, category: category, content: content, excerpt: excerpt, tags: tagsArray,
                authorId: user.uid, authorName: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                recommendCount: 0, commentCount: 0, recommenders: [], imageUrl: imageUrl 
            };
            db.collection("posts").add(newPost)
                .then(() => {
                    alert('Post published successfully!'); window.location.href = 'community.html';
                })
                .catch(error => {
                    console.error("Error adding post: ", error); alert('Error publishing post: ' + error.message);
                    if (submitButton) submitButton.disabled = false;
                });
        }
    }

    async function loadPosts(category, currentUser, action = 'current', targetPage = null) { 
        const paneId = `tab-${category}`; 
        const contentPane = document.getElementById(paneId);
        if (!contentPane || !db) return;
        
        const currentUserId = currentUser ? currentUser.uid : null; 
        let state = paginationState[category];

        try {
            if (action === 'init' || !state.loaded || state.allDocs.length === 0) {
                const querySnapshot = await db.collection("posts").where("category", "==", category).orderBy("createdAt", "desc").get();
                state.allDocs = querySnapshot.docs;
                state.totalDocs = querySnapshot.size;
                state.totalPages = Math.ceil(state.totalDocs / POSTS_PER_PAGE); 
                if (state.totalPages === 0) state.totalPages = 1;
                state.loaded = true; state.page = 1; 
            } else {
                if (action === 'next' && state.page < state.totalPages) state.page++;
                else if (action === 'prev' && state.page > 1) state.page--;
                else if (action === 'jump' && targetPage) state.page = targetPage;
                else if (action === 'last') state.page = state.totalPages;
                else if (action === 'init') state.page = 1; 
            }

            const startIndex = (state.page - 1) * POSTS_PER_PAGE;
            const endIndex = startIndex + POSTS_PER_PAGE;
            const currentDocs = state.allDocs.slice(startIndex, endIndex);

            contentPane.innerHTML = ''; 
            if (state.totalDocs === 0) { contentPane.innerHTML = '<p style="text-align: center; color: #888;">No posts found.</p>'; return; }

            const commentIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px; color: #888;"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>`;

            currentDocs.forEach(doc => {
                const post = doc.data(); const postId = doc.id; 
                let tagsHtml = '';
                if (post.tags && post.tags.length > 0) { tagsHtml = post.tags.map(tag => `<span class="tag">${tag}</span>`).join(''); }
                const postDate = post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'someday';
                const userHasLiked = post.recommenders && post.recommenders.includes(currentUserId);
                const likedClass = userHasLiked ? 'liked' : '';
                const imageIconHtml = post.imageUrl ? '<span class="post-image-icon" title="Image attached">📷</span>' : '';

                const solidHeartSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.75 3c1.99 0 3.969.835 5.25 2.25 1.281-1.415 3.26-2.25 5.25-2.25 3.036 0 5.5 2.322 5.5 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" /></svg>`;
                const outlineHeartSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>`;
                
                const heartIconHtml = userHasLiked ? solidHeartSvg : outlineHeartSvg;

                contentPane.innerHTML += `
                    <div class="post-card ${category === 'notices' ? 'notice' : ''}" onclick="location.href='post-detail.html?id=${postId}'" style="cursor: pointer;">
                        <div class="post-header">
                            <span class="post-category ${post.category === 'errors' ? 'error' : ''}">${post.category}</span>
                            <h3 class="post-title">${imageIconHtml}${post.title}</h3>
                        </div>
                        <div class="post-tags">${tagsHtml}</div>
                        <p class="post-excerpt">${post.excerpt}</p>
                        <div class="post-footer">
                            <div><span class="post-author">by ${post.authorName || 'User'}</span><span class="post-meta">· ${postDate}</span></div>
                            <div class="post-recommend">
                                <div style="display: flex; align-items: center; gap: 4px; margin-right: 15px;" title="Comments">
                                    ${commentIconSvg}
                                    <span style="font-weight: 600; color: #555;">${post.commentCount || 0}</span>
                                </div>
                                <button class="recommend-btn ${likedClass}" data-post-id="${postId}">${heartIconHtml}</button><span class="recommend-count" id="recommend-count-${postId}">${post.recommendCount || 0}</span>
                            </div>
                        </div>
                    </div>`;
            });
            
            attachRecommendListeners(currentUser);
            
            const btnSize = "32px"; 
            const btnCommonStyle = `width: ${btnSize}; height: ${btnSize}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9em; border: 1px solid #ddd; background: #fff; cursor: pointer; color: #555; transition: all 0.2s; margin: 0 3px; padding: 0;`;
            const btnActiveStyle = `background-color: #007aff; color: white; border-color: #007aff; box-shadow: 0 2px 4px rgba(0,122,255,0.3); transform: scale(1.05);`;
            const btnDisabledStyle = `background-color: #f9f9f9; color: #ccc; cursor: default; border-color: #eee;`;
            const hasPrev = state.page > 1; const hasNext = state.page < state.totalPages;
            const currentGroup = Math.ceil(state.page / PAGE_GROUP_SIZE);
            const startPageNum = (currentGroup - 1) * PAGE_GROUP_SIZE + 1;
            let endPageNum = startPageNum + PAGE_GROUP_SIZE - 1;
            if (endPageNum > state.totalPages) endPageNum = state.totalPages;

            let pageNumbersHtml = '';
            for (let i = startPageNum; i <= endPageNum; i++) {
                const isActive = (i === state.page);
                pageNumbersHtml += `<button class="page-num-btn" data-page="${i}" style="${isActive ? btnCommonStyle + ' ' + btnActiveStyle : btnCommonStyle}">${i}</button>`;
            }
            const firstBtnStyle = hasPrev ? btnCommonStyle : `${btnCommonStyle} ${btnDisabledStyle}`;
            const prevBtnStyle = hasPrev ? btnCommonStyle : `${btnCommonStyle} ${btnDisabledStyle}`;
            const nextBtnStyle = hasNext ? btnCommonStyle : `${btnCommonStyle} ${btnDisabledStyle}`;
            const lastBtnStyle = hasNext ? btnCommonStyle : `${btnCommonStyle} ${btnDisabledStyle}`;

            contentPane.insertAdjacentHTML('beforeend', `
                <div class="pagination-controls" style="display: flex; justify-content: center; gap: 2px; margin-top: 30px; align-items: center;">
                    <button class="form-button first-page-btn" ${!hasPrev ? 'disabled' : ''} style="${firstBtnStyle}">&lt;&lt;</button>
                    <button class="form-button prev-page-btn" ${!hasPrev ? 'disabled' : ''} style="${prevBtnStyle}">&lt;</button>
                    <div style="display:flex; gap: 0; margin: 0 5px;">${pageNumbersHtml}</div>
                    <button class="form-button next-page-btn" ${!hasNext ? 'disabled' : ''} style="${nextBtnStyle}">&gt;</button>
                    <button class="form-button last-page-btn" ${!hasNext ? 'disabled' : ''} style="${lastBtnStyle}">&gt;&gt;</button>
                </div>`);

            const controls = contentPane.querySelector('.pagination-controls');
            if(controls) {
                controls.querySelector('.first-page-btn')?.addEventListener('click', (e) => { e.preventDefault(); loadPosts(category, currentUser, 'init'); });
                controls.querySelector('.prev-page-btn')?.addEventListener('click', (e) => { e.preventDefault(); loadPosts(category, currentUser, 'prev'); });
                controls.querySelector('.next-page-btn')?.addEventListener('click', (e) => { e.preventDefault(); loadPosts(category, currentUser, 'next'); });
                controls.querySelector('.last-page-btn')?.addEventListener('click', (e) => { e.preventDefault(); loadPosts(category, currentUser, 'last'); });
                controls.querySelectorAll('.page-num-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => { e.preventDefault(); const target = parseInt(btn.dataset.page); if (target !== state.page) loadPosts(category, currentUser, 'jump', target); });
                });
            }
        } catch (err) {
            console.error("Error loading posts: ", err); contentPane.innerHTML = '<p style="text-align: center; color: red;">Error loading posts.</p>';
        }
    }
    
    // --- [수정] 직접 삭제 로직 (Ghost Report 생성 + Backup) ---
    function loadPostDetail(currentUser) { 
        const postDetailContainer = document.getElementById('post-detail-container');
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('id');
        if (!postId) { if (postDetailContainer) postDetailContainer.innerHTML = '<h1 class="page-title">Error: No post ID provided.</h1>'; return; }

        db.collection("posts").doc(postId).get().then(doc => {
            if (doc.exists) {
                const post = doc.data();
                let tagsHtml = '';
                if (post.tags && post.tags.length > 0) { tagsHtml = post.tags.map(tag => `<span class="tag">${tag}</span>`).join(''); }
                const postDate = post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'someday';
                let menuItemsHtml = '';
                const isAuthor = currentUser && currentUser.uid === post.authorId;
                
                if (isAuthor) {
                    menuItemsHtml = `<a href="write-post.html?id=${postId}" class="menu-item">Edit</a><a href="#" class="menu-item delete" id="post-delete-btn">Delete</a>`;
                } else if (currentUserIsAdmin) {
                    menuItemsHtml = `<a href="#" class="menu-item delete" id="post-delete-btn">Delete (Admin)</a><a href="#" class="menu-item post-report-btn" data-post-id="${postId}">Report</a>`;
                } else {
                    if (post.category !== 'notices') {
                        menuItemsHtml = `<a href="#" class="menu-item post-report-btn" data-post-id="${postId}">Report</a>`;
                    }
                }

                const imageHtml = post.imageUrl ? `<img src="${post.imageUrl}" alt="${post.title}" class="post-image-full">` : '';
                let menuContainerHtml = '';
                if (menuItemsHtml) {
                    menuContainerHtml = `<div class="post-menu-container"><button class="menu-toggle-btn" id="post-menu-btn">...</button><div class="menu-dropdown" id="post-menu-dropdown">${menuItemsHtml}</div></div>`;
                }

                const fromAdmin = urlParams.get('from') === 'admin';
                const backLink = fromAdmin ? 'admin.html?tab=reports' : 'community.html';
                const backText = fromAdmin ? '← Back to Reports' : '← Back to Menu';

                const postHtml = `
                    <div class="post-full-content">
                        ${menuContainerHtml}
                        <h1 class="page-title">${post.title}</h1>
                        <div class="post-meta-detail"><span class="post-author">by ${post.authorName || 'User'}</span><span class="post-meta">· ${postDate}</span></div>
                        <div class="post-tags">${tagsHtml}</div>
                        ${imageHtml} 
                        <div class="post-body"><p>${post.content || post.excerpt}</p></div>
                    </div>
                    <div class="comments-section">
                        <h2>Comments (${post.commentCount || 0})</h2>
                        
                        <div class="comment-write-box">
                            <div id="reply-context-inline" class="reply-context-inline">
                                <span id="reply-context-text-inline">To: User</span>
                                <button id="btn-cancel-reply-inline" class="btn-cancel-reply-inline" title="Cancel">×</button>
                            </div>

                            <textarea placeholder="Write a comment..." id="comment-textarea"></textarea>
                            
                            <button id="comment-submit-btn" class="send-comment-btn" title="Send">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                                </svg>
                            </button>
                        </div>
                        <div id="comments-list" style="margin-bottom: 80px;"></div>
                    </div>
                    <div style="margin-top: 50px; text-align: center; margin-bottom: 20px;">
                        <a href="${backLink}" class="form-button" style="width: auto; display: inline-block; text-decoration: none;">${backText}</a>
                    </div>`;
                if (postDetailContainer) postDetailContainer.innerHTML = postHtml;

                const menuBtn = document.getElementById('post-menu-btn');
                const menuDropdown = document.getElementById('post-menu-dropdown');
                if (menuBtn && menuDropdown) { menuBtn.addEventListener('click', () => menuDropdown.classList.toggle('show')); }
                
                if (isAuthor || currentUserIsAdmin) {
                    const deleteBtn = document.getElementById('post-delete-btn');
                    if (deleteBtn) {
                        deleteBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            const confirmMessage = currentUserIsAdmin && !isAuthor ? 'ADMIN ACTION: Delete this user\'s post? A backup will be saved.' : 'Are you sure you want to delete this post?';
                            
                            if (confirm(confirmMessage)) {
                                let processPromise = Promise.resolve();
                                if (currentUserIsAdmin && !isAuthor) {
                                    processPromise = db.collection("reports").add({
                                        postId: postId,
                                        reporterUid: currentUser.uid,
                                        reason: "Direct Deletion by Admin (Post View)",
                                        status: "deleted",
                                        backupData: post, 
                                        collectionPath: "posts",
                                        docId: postId,
                                        reportedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                        actionTakenAt: firebase.firestore.FieldValue.serverTimestamp()
                                    });
                                }
                                processPromise.then(() => {
                                    return db.collection("posts").doc(postId).delete();
                                }).then(() => { 
                                    alert('Post deleted.'); 
                                    window.location.href = 'community.html'; 
                                }).catch(error => { 
                                    console.error("Error deleting post: ", error); 
                                    alert('Error: ' + error.message); 
                                });
                            }
                        });
                    }
                }
                
                // [신규] 인라인 답글 취소 버튼 리스너
                const btnCancelReply = document.getElementById('btn-cancel-reply-inline');
                if (btnCancelReply) {
                    btnCancelReply.addEventListener('click', () => {
                        resetReplyMode();
                    });
                }

                attachReportListeners(currentUser);
                attachCommentSubmitListener(postId, currentUser);
                loadComments(postId, currentUser); 
            } else { if (postDetailContainer) postDetailContainer.innerHTML = '<h1 class="page-title">Error: Post not found.</h1>'; }
        }).catch(error => { console.error("Error loading post details: ", error); if (postDetailContainer) postDetailContainer.innerHTML = '<h1 class="page-title">Error loading post.</h1>'; });
    }

    // [신규] 대댓글 모드 리셋 헬퍼 (인라인 UI 제어)
    function resetReplyMode() {
        activeReplyTarget = null;
        const contextBar = document.getElementById('reply-context-inline');
        if (contextBar) contextBar.classList.remove('show');
        
        const textarea = document.getElementById('comment-textarea');
        if (textarea) textarea.placeholder = "Write a comment...";
    }

    // [수정] 댓글 등록 함수 (AJAX & 대댓글 지원 - 답글 대상 정보 저장 포함)
    function attachCommentSubmitListener(postId, user) {
        const commentSubmitBtn = document.getElementById('comment-submit-btn');
        const commentTextarea = document.getElementById('comment-textarea');
        if (!commentTextarea) return;

        const submitComment = () => {
            const commentText = commentTextarea.value;
            if (commentText.trim() === '') { alert('Please write a comment.'); return; }
            if (!user) { alert('You must be logged in.'); window.location.href = 'login.html'; return; }

            if(commentSubmitBtn) commentSubmitBtn.disabled = true;

            const payload = {
                text: commentText, 
                authorId: user.uid, 
                authorName: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // 대댓글일 경우 부모 ID와 대상 닉네임 저장
            if (activeReplyTarget) {
                payload.parentId = activeReplyTarget.id; 
                payload.replyTo = activeReplyTarget.author; // [신규]
            }

            db.collection("posts").doc(postId).collection("comments").add(payload)
            .then((docRef) => {
                // 1. 카운트 증가
                db.collection("posts").doc(postId).update({ commentCount: firebase.firestore.FieldValue.increment(1) });
                
                // 2. [AJAX] UI에 즉시 반영 (새로고침 X)
                commentTextarea.value = '';
                if(commentSubmitBtn) commentSubmitBtn.disabled = false;

                // 입력 데이터 기반 임시 객체 생성
                const newComment = {
                    id: docRef.id,
                    text: commentText,
                    authorName: user.displayName || 'User',
                    authorId: user.uid,
                    createdAt: { seconds: Date.now() / 1000 },
                    parentId: activeReplyTarget ? activeReplyTarget.id : null,
                    replyTo: activeReplyTarget ? activeReplyTarget.author : null // [신규]
                };

                // 어디에 붙일지 결정
                if (newComment.parentId) {
                    // It's a reply -> Append to parent (as last child)
                    const parentEl = document.getElementById(`comment-${newComment.parentId}`);
                    if (parentEl) {
                        // 부모 뒤에 바로 붙임 (대댓글들은 오래된 순서대로 아래로 쌓임)
                        renderCommentItem(parentEl, newComment, postId, user, true, 'afterend');
                    }
                } else {
                    // It's a root comment -> Prepend to list (Newest First)
                    const list = document.getElementById('comments-list');
                    renderCommentItem(list, newComment, postId, user, false, 'afterbegin');
                }

                // 리스너 재연결
                attachCommentMenuListeners();
                attachCommentDeleteListeners();
                attachReportListeners(user);
                attachReplyToggleListeners(); // 답글 버튼 리스너
                attachCommentEditListeners(); // [추가] 수정 리스너

                // 모드 초기화
                resetReplyMode();

            })
            .catch(error => { 
                console.error("Error: ", error); alert('Error: ' + error.message); 
                if(commentSubmitBtn) commentSubmitBtn.disabled = false;
            });
        };

        commentTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); submitComment();
            }
        });

        if (commentSubmitBtn) {
            commentSubmitBtn.addEventListener('click', submitComment);
        }
    }

    // [수정] 댓글 로딩 함수 (재귀적 렌더링 & 정렬 적용)
    function loadComments(postId, currentUser) { 
        const commentsListDiv = document.getElementById('comments-list');
        if (!commentsListDiv || !db) return;

        // DB에서 시간순(오래된 것 -> 최신 것)으로 가져옴
        db.collection("posts").doc(postId).collection("comments").orderBy("createdAt", "asc").get()
          .then(querySnapshot => {
                commentsListDiv.innerHTML = ''; 
                if (querySnapshot.empty) { commentsListDiv.innerHTML = '<p style="text-align: center; color: #888;">No comments yet.</p>'; return; }
                
                const allComments = [];
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    data.id = doc.id;
                    allComments.push(data);
                });

                // 1. 최상위 댓글 필터링 (부모 없음)
                // DB에서 오름차순(Oldest->Newest)으로 왔으므로, 뒤집어서(Newest->Oldest) 표시
                const rootComments = allComments.filter(c => !c.parentId).reverse();
                
                rootComments.forEach(comment => {
                    renderRecursiveComments(commentsListDiv, comment, allComments, postId, currentUser);
                });

                attachCommentMenuListeners();
                attachCommentDeleteListeners(); 
                attachReportListeners(currentUser);
                attachReplyToggleListeners(); 
                attachCommentEditListeners(); // [추가] 수정 리스너

          }).catch(error => { console.error("Error loading comments: ", error); commentsListDiv.innerHTML = '<p style="text-align: center; color: red;">Error loading comments.</p>'; });
    }

    // [수정] 재귀적 댓글 렌더링 (대댓글 "답글 더보기/접기" 기능 적용)
function renderRecursiveComments(container, comment, allComments, postId, currentUser) {
    // 1. 현재 댓글 렌더링
    const isReply = container.id !== 'comments-list'; 
    // renderCommentItem 호출 시 DOM에 바로 그립니다.
    const commentEl = renderCommentItem(container, comment, postId, currentUser, isReply, 'beforeend');

    // 2. 자식 댓글(대댓글) 찾기
    const children = allComments.filter(c => c.parentId === comment.id);
    
    // 3. 자식들이 있다면 "답글 더보기" 버튼 생성
    if (children.length > 0) {
        // 댓글 내용 영역(comment-content-area)을 찾아 그 아래에 버튼을 둡니다.
        const contentArea = commentEl.querySelector('.comment-content-area');
        
        // 버튼과 대댓글 컨테이너의 고유 ID 생성
        const btnId = `btn-replies-${comment.id}`;
        const containerId = `replies-container-${comment.id}`;
        
        // 토글 버튼 및 대댓글 컨테이너 HTML
        const toggleHtml = `
            <div class="replies-toggle-wrapper" style="margin-top: 8px;">
                <button id="${btnId}" class="show-replies-btn" style="
                    background: none; border: none; color: #065fd4; 
                    font-weight: 600; cursor: pointer; display: flex; 
                    align-items: center; font-size: 0.9em; padding: 6px 0;
                    gap: 6px; transition: background-color 0.2s;
                ">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 16px; height: 16px;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                    show more reply (${children.length})
                </button>
            </div>
            <div id="${containerId}" class="replies-container" style="display: none; width: 100%; margin-left: 10px; border-left: 2px solid #f0f0f0; padding-left: 10px;"></div>
        `;
        
        // contentArea가 있으면 그 안에, 없으면 댓글 요소 맨 끝에 붙입니다.
        if (contentArea) {
            contentArea.insertAdjacentHTML('beforeend', toggleHtml);
        } else {
            commentEl.insertAdjacentHTML('beforeend', toggleHtml);
        }
        
        const toggleBtn = document.getElementById(btnId);
        const repliesContainer = document.getElementById(containerId);
        
        // 버튼 이벤트 리스너 (열기/닫기)
        if (toggleBtn && repliesContainer) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 이벤트 버블링 방지
                
                const isHidden = (repliesContainer.style.display === 'none');
                
                if (isHidden) {
                    // [열기]
                    repliesContainer.style.display = 'block';
                    toggleBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 16px; height: 16px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                        </svg>
                        Show less reply
                    `;
                } else {
                    // [닫기]
                    repliesContainer.style.display = 'none';
                    toggleBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 16px; height: 16px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                        show more reply (${children.length})
                    `;
                }
            });
            
            // 대댓글들을 미리 렌더링해둡니다 (화면엔 안 보임)
            children.forEach(child => {
                renderRecursiveComments(repliesContainer, child, allComments, postId, currentUser);
            });
        }
    }
}

    // [수정] 댓글 아이템 HTML 생성 및 삽입
function renderCommentItem(container, comment, postId, currentUser, isReply, position = 'beforeend') {
    const commentDate = comment.createdAt ? new Date(comment.createdAt.seconds * 1000).toLocaleString() : 'Just now';
    const isAuthor = currentUser && currentUser.uid === comment.authorId;
    const authorName = comment.authorName || 'User';
    const initial = authorName.charAt(0).toUpperCase(); 
    
    // --- [수정] 메뉴 아이템 분기 (수정 추가 & 삭제 분리) ---
    let menuItems = '';

    // 1. Edit (작성자 본인) - [신규] 수정 버튼 추가
    if (isAuthor) {
         menuItems += `<a href="#" class="menu-item comment-edit-btn" data-post-id="${postId}" data-comment-id="${comment.id}">Edit</a>`;
    }

    // 2. Report (모두)
    menuItems += `<a href="#" class="menu-item comment-report-btn" data-post-id="${postId}" data-comment-id="${comment.id}">Report</a>`;

    // 3. Delete (작성자 본인) - [수정] 작성자 전용 삭제 (클래스명 변경: comment-delete-self-btn)
    if (isAuthor) {
         menuItems += `<a href="#" class="menu-item delete comment-delete-self-btn" data-post-id="${postId}" data-comment-id="${comment.id}">Delete</a>`;
    }

    // 4. Delete (관리자) - [수정] 관리자 전용 삭제 (클래스명 변경: comment-delete-admin-btn)
    if (currentUserIsAdmin) {
         menuItems += `<a href="#" class="menu-item delete comment-delete-admin-btn" data-post-id="${postId}" data-comment-id="${comment.id}" style="color:red; font-weight:bold;">Delete (Admin)</a>`;
    }

    // 메뉴 버튼 HTML (점 3개)
    const menuBtnHtml = `<button class="menu-toggle-btn comment-menu-btn" data-target="comment-menu-${comment.id}">&#8942;</button>`;
    
    const menuHtml = `
        <div class="comment-menu-wrapper">
            ${menuBtnHtml}
            <div class="menu-dropdown" id="comment-menu-${comment.id}">
                ${menuItems}
            </div>
        </div>`;

    // 답글 쓰기 버튼 (텍스트 변경: Write reply)
    const replyBtnHtml = `<button class="reply-toggle-btn" data-comment-id="${comment.id}" data-author-name="${authorName}">Write reply</button>`;

    // 멘션 태그 (@닉네임)
    const mentionHtml = (isReply && comment.replyTo) ? `<span class="mention" style="color:#065fd4; margin-right:5px;">@${comment.replyTo}</span>` : '';

    const cardClass = isReply ? 'comment-card reply-item' : 'comment-card';
    
    // HTML 구조 조합 (공백 제거 적용)
    const html = `
        <div class="${cardClass}" id="comment-${comment.id}" style="position: relative;">
            <div class="comment-avatar">${initial}</div>
            <div class="comment-content-area" style="width: 100%;">
                <div class="comment-header-line">
                    <span class="comment-author">${authorName}</span>
                    <span class="comment-meta">${commentDate}</span>
                </div>
                <div class="comment-body">${mentionHtml}${comment.text}</div>
                <div class="comment-actions-line">
                    ${replyBtnHtml}
                </div>
            </div>
            ${menuHtml}
        </div>
    `;
    
    // DOM 삽입
    container.insertAdjacentHTML(position, html);
    
    // 방금 삽입된 요소 반환
    return document.getElementById(`comment-${comment.id}`);
}

    // [신규] Reply 버튼 클릭 시 로직
    function attachReplyToggleListeners() {
        document.querySelectorAll('.reply-toggle-btn').forEach(btn => {
            // 중복 방지
            if(btn.dataset.replyListener) return;
            btn.dataset.replyListener = "true";

            btn.addEventListener('click', (e) => {
                const commentId = btn.dataset.commentId;
                const authorName = btn.dataset.authorName;
                
                // 1. 상태 업데이트
                activeReplyTarget = { id: commentId, author: authorName };
                
                // 2. 인라인 알림바 업데이트
                const contextBar = document.getElementById('reply-context-inline');
                const contextText = document.getElementById('reply-context-text-inline');
                const textarea = document.getElementById('comment-textarea');
                
                if (contextBar && contextText) {
                    contextText.textContent = `To: ${authorName}`;
                    contextBar.classList.add('show');
                }
                
                if (textarea) {
                    textarea.placeholder = `Reply to ${authorName}...`;
                    textarea.focus();
                }
            });
        });
    }
    
    function attachCommentMenuListeners() {
        document.querySelectorAll('.comment-menu-btn').forEach(btn => {
            if (btn.dataset.listenerAttached) return;
            btn.dataset.listenerAttached = true;
            btn.addEventListener('click', (e) => { e.stopPropagation(); const targetId = btn.dataset.target; const dropdown = document.getElementById(targetId); if(dropdown) { document.querySelectorAll('.menu-dropdown.show').forEach(d => { if (d.id !== targetId) d.classList.remove('show'); }); dropdown.classList.toggle('show'); } });
        });
    }

    function attachCommentDeleteListeners() {
        // 1. [신규] 작성자 본인 삭제 (백업 X, 즉시 삭제)
        document.querySelectorAll('.comment-delete-self-btn').forEach(btn => {
            if (btn.dataset.listenerAttached) return;
            btn.dataset.listenerAttached = true;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const postId = btn.dataset.postId;
                const commentId = btn.dataset.commentId;
                
                if (confirm('Are you sure you want to delete this comment?')) {
                    db.collection("posts").doc(postId).collection("comments").doc(commentId).delete()
                    .then(() => { 
                        // 카운트 감소
                        return db.collection("posts").doc(postId).update({ commentCount: firebase.firestore.FieldValue.increment(-1) }); 
                    })
                    .then(() => { 
                        // UI에서 제거
                        const el = document.getElementById(`comment-${commentId}`);
                        if(el) el.remove();
                    })
                    .catch(error => { alert('Error: ' + error.message); });
                }
            });
        });

        // 2. [수정] 관리자 삭제 (deleted reports에 백업 O)
        document.querySelectorAll('.comment-delete-admin-btn').forEach(btn => {
            if (btn.dataset.listenerAttached) return;
            btn.dataset.listenerAttached = true;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const postId = btn.dataset.postId; 
                const commentId = btn.dataset.commentId;
                
                if (confirm('ADMIN ACTION: Delete this comment? A backup will be saved.')) {
                    const commentRef = db.collection("posts").doc(postId).collection("comments").doc(commentId);
                    commentRef.get().then(docSnap => {
                        if (docSnap.exists) {
                            const data = docSnap.data();
                            // 'reports' 컬렉션에 deleted 상태로 저장 (백업)
                            db.collection("reports").add({
                                postId: postId,
                                commentId: commentId,
                                reporterUid: "admin", 
                                reason: "Direct Deletion by Admin (Comment)",
                                status: "deleted",
                                backupData: data, 
                                collectionPath: `posts/${postId}/comments`,
                                docId: commentId,
                                reportedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                actionTakenAt: firebase.firestore.FieldValue.serverTimestamp()
                            }).then(() => {
                                return commentRef.delete();
                            }).then(() => { 
                                return db.collection("posts").doc(postId).update({ commentCount: firebase.firestore.FieldValue.increment(-1) }); 
                            }).then(() => { 
                                const el = document.getElementById(`comment-${commentId}`);
                                if(el) el.remove();
                            }).catch(error => { console.error("Error: ", error); alert('Error: ' + error.message); });
                        }
                    });
                }
            });
        });
    }

    // [신규] 댓글 수정 리스너
    function attachCommentEditListeners() {
        document.querySelectorAll('.comment-edit-btn').forEach(btn => {
            if (btn.dataset.listenerAttached) return;
            btn.dataset.listenerAttached = true;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const postId = btn.dataset.postId;
                const commentId = btn.dataset.commentId;
                const card = document.getElementById(`comment-${commentId}`);
                const bodyEl = card.querySelector('.comment-body');

                if (card.classList.contains('editing')) return; // 이미 수정 중이면 무시

                // 메뉴 닫기
                document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('show'));

                // DB에서 원본 텍스트 가져오기 (HTML 태그 제거된 순수 텍스트)
                db.collection("posts").doc(postId).collection("comments").doc(commentId).get()
                .then(doc => {
                    if(!doc.exists) return alert("Comment not found.");
                    const currentText = doc.data().text; 
                    const originalHtml = bodyEl.innerHTML; // 취소 시 복구용

                    card.classList.add('editing');

                    // 수정 UI로 교체
                    bodyEl.innerHTML = `
                        <textarea class="edit-textarea" style="width:100%; height:60px; padding:10px; border:1px solid #ddd; border-radius:8px; resize:none; font-family:inherit;">${currentText}</textarea>
                        <div style="margin-top:5px; text-align:right;">
                            <button class="btn-cancel-edit" style="margin-right:5px; padding:5px 12px; border:none; background:#f0f0f0; border-radius:4px; cursor:pointer;">Cancel</button>
                            <button class="btn-save-edit" style="padding:5px 12px; border:none; background:#007aff; color:white; border-radius:4px; cursor:pointer; font-weight:600;">Save</button>
                        </div>
                    `;

                    const textarea = bodyEl.querySelector('.edit-textarea');
                    textarea.focus();

                    // 취소 버튼
                    bodyEl.querySelector('.btn-cancel-edit').addEventListener('click', () => {
                        bodyEl.innerHTML = originalHtml;
                        card.classList.remove('editing');
                    });

                    // 저장 버튼
                    bodyEl.querySelector('.btn-save-edit').addEventListener('click', () => {
                        const newText = textarea.value;
                        if (!newText.trim()) return alert("Comment cannot be empty.");
                        
                        db.collection("posts").doc(postId).collection("comments").doc(commentId).update({
                            text: newText,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }).then(() => {
                            // 저장 후 목록 새로고침 (멘션 등 스타일 유지를 위해 리로드 권장)
                            const currentUser = firebase.auth().currentUser;
                            loadComments(postId, currentUser);
                        }).catch(err => alert("Error updating: " + err.message));
                    });
                });
            });
        });
    }

    function attachRecommendListeners(currentUser) {
        const solidHeartSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.75 3c1.99 0 3.969.835 5.25 2.25 1.281-1.415 3.26-2.25 5.25-2.25 3.036 0 5.5 2.322 5.5 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" /></svg>`;
        const outlineHeartSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>`;

        document.querySelectorAll('.recommend-btn').forEach(btn => {
            if (btn.dataset.listenerAttached) return; btn.dataset.listenerAttached = true;
            btn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation(); 
                if (!currentUser) { alert('You must be logged in.'); window.location.href = 'login.html'; return; }
                const postId = btn.dataset.postId; const postRef = db.collection("posts").doc(postId); const currentUserId = currentUser.uid; const countSpan = document.getElementById(`recommend-count-${postId}`);
                db.runTransaction(transaction => {
                    return transaction.get(postRef).then(doc => {
                        if (!doc.exists) throw "Document does not exist!";
                        const postData = doc.data(); const recommenders = postData.recommenders || [];
                        let newCount, newRecommenders;
                        if (recommenders.includes(currentUserId)) { newCount = firebase.firestore.FieldValue.increment(-1); newRecommenders = firebase.firestore.FieldValue.arrayRemove(currentUserId); }
                        else { newCount = firebase.firestore.FieldValue.increment(1); newRecommenders = firebase.firestore.FieldValue.arrayUnion(currentUserId); }
                        transaction.update(postRef, { recommendCount: newCount, recommenders: newRecommenders });
                        return { liked: !recommenders.includes(currentUserId), newCount: recommenders.includes(currentUserId) ? (postData.recommendCount - 1) : (postData.recommendCount + 1) };
                    });
                }).then(result => { 
                    if (countSpan) countSpan.textContent = result.newCount; 
                    if (result.liked) {
                        btn.classList.add('liked');
                        btn.innerHTML = solidHeartSvg; 
                    } else {
                        btn.classList.remove('liked');
                        btn.innerHTML = outlineHeartSvg; 
                    }
                })
                .catch(error => { console.error("Transaction failed: ", error); alert("Failed to update recommendation: " + error); });
            });
        });
    }

    function attachReportListeners(currentUser) {
        document.querySelectorAll('.post-report-btn').forEach(btn => {
            if (btn.dataset.listenerAttached) return; btn.dataset.listenerAttached = true;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!currentUser) { alert('You must be logged in to report.'); window.location.href = 'login.html'; return; }
                const reason = prompt('Reason for reporting this POST:');
                if (reason && reason.trim() !== '') { submitReport(currentUser.uid, btn.dataset.postId, null, reason); }
            });
        });
        document.querySelectorAll('.comment-report-btn').forEach(btn => {
            if (btn.dataset.listenerAttached) return; btn.dataset.listenerAttached = true;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!currentUser) { alert('You must be logged in to report.'); window.location.href = 'login.html'; return; }
                const reason = prompt('Reason for reporting this COMMENT:');
                if (reason && reason.trim() !== '') { submitReport(currentUser.uid, btn.dataset.postId, btn.dataset.commentId, reason); }
            });
        });
    }

    function submitReport(reporterUid, postId, commentId, reason) {
        const newReport = { reporterUid: reporterUid, postId: postId, reason: reason, status: "pending", reportedAt: firebase.firestore.FieldValue.serverTimestamp() };
        if (commentId) newReport.commentId = commentId;
        db.collection("reports").add(newReport).then(() => { alert("Report submitted."); }).catch(error => { console.error("Error: ", error); alert("Error: " + error.message); });
    }
    
    // (이하 Admin 관련 함수들 생략 없이 그대로 사용)
    function setupAdminReportFilters() {
        document.getElementById('btn-filter-pending')?.addEventListener('click', () => { loadAdminReports('pending', 'init'); });
        document.getElementById('btn-filter-complete')?.addEventListener('click', () => { loadAdminReports('reviewed', 'init'); });
        document.getElementById('btn-filter-deleted')?.addEventListener('click', () => { loadAdminReports('deleted', 'init'); });
    }

    function loadAdminReports(statusFilter = 'pending', action = 'current', targetPage = null) {
        const container = document.getElementById('admin-reports-container');
        const titleElement = document.getElementById('report-section-title');
        if (!container || !db) return;

        let titleText = "🚨 Pending Reports";
        if (statusFilter === 'reviewed') titleText = "✅ Completed Reports";
        if (statusFilter === 'deleted') titleText = "🗑️ Deleted History";
        if (titleElement) titleElement.textContent = titleText;

        let state = adminPaginationState[statusFilter];
        const shouldFetch = (action === 'init' || !state.loaded);

        if (shouldFetch) {
            container.innerHTML = '<p>Loading...</p>';
        }

        const fetchPromise = shouldFetch
            ? db.collection("reports").where("status", "==", statusFilter).orderBy("reportedAt", "desc").get()
            : Promise.resolve(null);

        fetchPromise.then(querySnapshot => {
            if (querySnapshot) {
                state.allDocs = querySnapshot.docs;
                state.totalDocs = querySnapshot.size;
                state.totalPages = Math.ceil(state.totalDocs / POSTS_PER_PAGE);
                if (state.totalPages === 0) state.totalPages = 1;
                state.loaded = true;
                state.page = 1;
            } else {
                if (action === 'next' && state.page < state.totalPages) state.page++;
                else if (action === 'prev' && state.page > 1) state.page--;
                else if (action === 'jump' && targetPage) state.page = targetPage;
                else if (action === 'last') state.page = state.totalPages;
                else if (action === 'init') state.page = 1;
            }

            const startIndex = (state.page - 1) * POSTS_PER_PAGE;
            const endIndex = startIndex + POSTS_PER_PAGE;
            const currentDocs = state.allDocs.slice(startIndex, endIndex);

            container.innerHTML = '';
            if (state.totalDocs === 0) {
                container.innerHTML = `<p style="text-align: center; color: #888;">No ${statusFilter} reports found.</p>`;
                return;
            }
            
            let tableHtml = `<table class="admin-report-table"><thead><tr><th>Reported At</th><th>Type</th><th>Reason</th><th>Link</th><th>Action</th></tr></thead><tbody>`;
            
            currentDocs.forEach(doc => {
                const report = doc.data();
                const reportId = doc.id;
                const date = report.reportedAt ? new Date(report.reportedAt.seconds * 1000).toLocaleString() : 'N/A';
                const isComment = !!report.commentId;
                const type = isComment ? 'Comment' : 'Post';
                
                let link = `<a href="post-detail.html?id=${report.postId}&from=admin" target="_blank">View Content</a>`;
                if (statusFilter === 'deleted') {
                    link = `<button class="form-button view-backup-btn" data-report-id="${reportId}" style="padding:5px 10px; font-size:0.8em; background-color:#6c757d;">View Backup</button>`;
                }

                let actionBtn = '';
                if (statusFilter === 'pending') {
                    actionBtn = `
                        <div style="display:flex; gap:5px;">
                            <button class="form-button admin-review-btn" data-report-id="${reportId}" style="padding:5px 10px; font-size:0.8em;">Checked</button>
                            <button class="form-button admin-delete-confirm-btn" data-report-id="${reportId}" data-post-id="${report.postId}" data-comment-id="${report.commentId || ''}" style="padding:5px 10px; font-size:0.8em; background-color:#ff3b30;">Delete</button>
                        </div>
                    `;
                } else if (statusFilter === 'reviewed') {
                    actionBtn = `<span style="color: green; font-weight:bold;">Completed</span>`;
                } else {
                    actionBtn = `
                        <button class="form-button admin-restore-btn" data-report-id="${reportId}" style="padding:5px 10px; font-size:0.8em; background-color:#34c759;">Restore</button>
                    `;
                }

                tableHtml += `<tr id="report-row-${reportId}"><td>${date}</td><td>${type}</td><td>${report.reason}</td><td>${link}</td><td>${actionBtn}</td></tr>`;
            });
            
            tableHtml += '</tbody></table>';
            container.innerHTML = tableHtml;
            
            const btnSize = "32px"; 
            const btnCommonStyle = `width: ${btnSize}; height: ${btnSize}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9em; border: 1px solid #ddd; background: #fff; cursor: pointer; color: #555; transition: all 0.2s; margin: 0 3px; padding: 0;`;
            const btnActiveStyle = `background-color: #007aff; color: white; border-color: #007aff; box-shadow: 0 2px 4px rgba(0,122,255,0.3); transform: scale(1.05);`;
            const btnDisabledStyle = `background-color: #f9f9f9; color: #ccc; cursor: default; border-color: #eee;`;
            
            const hasPrev = state.page > 1; 
            const hasNext = state.page < state.totalPages;
            const currentGroup = Math.ceil(state.page / PAGE_GROUP_SIZE);
            const startPageNum = (currentGroup - 1) * PAGE_GROUP_SIZE + 1;
            let endPageNum = startPageNum + PAGE_GROUP_SIZE - 1;
            if (endPageNum > state.totalPages) endPageNum = state.totalPages;

            let pageNumbersHtml = '';
            for (let i = startPageNum; i <= endPageNum; i++) {
                const isActive = (i === state.page);
                pageNumbersHtml += `<button class="admin-page-num-btn" data-page="${i}" style="${isActive ? btnCommonStyle + ' ' + btnActiveStyle : btnCommonStyle}">${i}</button>`;
            }

            container.insertAdjacentHTML('beforeend', `
                <div class="pagination-controls" style="display: flex; justify-content: center; gap: 2px; margin-top: 20px; align-items: center;">
                    <button class="form-button admin-first-btn" ${!hasPrev ? 'disabled' : ''} style="${hasPrev ? btnCommonStyle : btnCommonStyle + ' ' + btnDisabledStyle}">&lt;&lt;</button>
                    <button class="form-button admin-prev-btn" ${!hasPrev ? 'disabled' : ''} style="${hasPrev ? btnCommonStyle : btnCommonStyle + ' ' + btnDisabledStyle}">&lt;</button>
                    <div style="display:flex; gap: 0; margin: 0 5px;">${pageNumbersHtml}</div>
                    <button class="form-button admin-next-btn" ${!hasNext ? 'disabled' : ''} style="${hasNext ? btnCommonStyle : btnCommonStyle + ' ' + btnDisabledStyle}">&gt;</button>
                    <button class="form-button admin-last-btn" ${!hasNext ? 'disabled' : ''} style="${hasNext ? btnCommonStyle : btnCommonStyle + ' ' + btnDisabledStyle}">&gt;&gt;</button>
                </div>`);

            container.querySelector('.admin-first-btn')?.addEventListener('click', () => loadAdminReports(statusFilter, 'init'));
            container.querySelector('.admin-prev-btn')?.addEventListener('click', () => loadAdminReports(statusFilter, 'prev'));
            container.querySelector('.admin-next-btn')?.addEventListener('click', () => loadAdminReports(statusFilter, 'next'));
            container.querySelector('.admin-last-btn')?.addEventListener('click', () => loadAdminReports(statusFilter, 'last'));
            container.querySelectorAll('.admin-page-num-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const target = parseInt(btn.dataset.page);
                    if (target !== state.page) loadAdminReports(statusFilter, 'jump', target);
                });
            });

            if (statusFilter === 'pending') {
                attachReportActionListeners();
            } else if (statusFilter === 'deleted') {
                attachRestoreListeners(); 
                attachViewBackupListeners(); 
                
                if (state.totalDocs > 0) {
                    container.insertAdjacentHTML('beforeend', `
                        <div style="margin-top: 30px; text-align: right; border-top: 1px solid #eee; padding-top: 20px;">
                            <p style="color: #666; font-size: 0.9em; margin-bottom: 10px;">⚠️ This action will permanently remove all reports and their backups in this list.</p>
                            <button id="btn-clear-history" class="form-button" style="background-color: #ff3b30; width: auto; display: inline-block;">🗑️ Clear this list (Permanent Delete)</button>
                        </div>
                    `);
                    
                    document.getElementById('btn-clear-history').addEventListener('click', () => {
                        if(confirm("Are you sure you want to PERMANENTLY DELETE all items in this list?\nThis action cannot be undone.")) {
                            clearAllDeletedReports();
                        }
                    });
                }
            }
        }).catch(error => {
            console.error("Error loading reports: ", error);
            container.innerHTML = '<p style="text-align: center; color: red;">Error loading reports.</p>';
        });
    }
    
    function clearAllDeletedReports() {
        db.collection("reports").where("status", "==", "deleted").get()
        .then(snapshot => {
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            return batch.commit();
        }).then(() => {
            alert("All deleted history has been cleared permanently.");
            loadAdminReports('deleted', 'init'); 
        }).catch(err => {
            console.error("Error clearing history:", err);
            alert("Error: " + err.message);
        });
    }
    
    function attachViewBackupListeners() {
        document.querySelectorAll('.view-backup-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reportId = btn.dataset.reportId;
                db.collection("reports").doc(reportId).get().then(doc => {
                    if(doc.exists && doc.data().backupData) {
                        showBackupModal(doc.data().backupData);
                    } else {
                        alert("No backup data found.");
                    }
                }).catch(err => alert("Error fetching backup: " + err.message));
            });
        });
    }

    function showBackupModal(data) {
        const existing = document.getElementById('backup-modal');
        if(existing) existing.remove();

        let dateStr = 'Unknown Date';
        if (data.createdAt && data.createdAt.seconds) {
            dateStr = new Date(data.createdAt.seconds * 1000).toLocaleString();
        }

        const modalHtml = `
            <div id="backup-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:10000;">
                <div style="background:white; padding:30px; border-radius:12px; max-width:600px; width:90%; max-height:80vh; overflow-y:auto; position:relative; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                    <button onclick="document.getElementById('backup-modal').remove()" style="position:absolute; top:15px; right:15px; border:none; background:none; font-size:1.5em; cursor:pointer; color:#888;">&times;</button>
                    
                    <h3 style="margin-top:0; color:#007aff;">Backup Content Preview</h3>
                    <hr style="border:0; border-bottom:1px solid #eee; margin:15px 0;">

                    <h2 style="margin:0 0 10px 0; color:#333;">${data.title || '(Comment or No Title)'}</h2>
                    
                    <div style="margin-bottom:15px; font-size:0.9em; color:#666;">
                        <strong>Author:</strong> ${data.authorName || 'Unknown'} <br>
                        <strong>Date:</strong> ${dateStr} <br>
                        <strong>Tags:</strong> ${(data.tags || []).join(', ')}
                    </div>

                    ${data.imageUrl ? `<img src="${data.imageUrl}" style="max-width:100%; height:auto; margin-bottom:15px; border-radius:8px; border:1px solid #eee;">` : ''}
                    
                    <div style="line-height:1.6; color:#333; background:#f9f9f9; padding:15px; border-radius:8px;">
                        ${data.content || data.text || 'No textual content.'}
                    </div>

                    <div style="margin-top:20px; text-align:right;">
                        <button class="form-button" onclick="document.getElementById('backup-modal').remove()" style="width:auto;">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    function attachReportActionListeners() {
        const reviewBtns = document.querySelectorAll('.admin-review-btn');
        reviewBtns.forEach(btn => {
            if (btn.dataset.listenerAttached) return;
            btn.dataset.listenerAttached = true;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const reportId = btn.dataset.reportId;
                if (confirm('Mark this report as checked? It will be moved to the Completed list.')) {
                    db.collection("reports").doc(reportId).update({ 
                        status: "reviewed",
                        reportedAt: firebase.firestore.FieldValue.serverTimestamp()
                    })
                    .then(() => {
                        alert('Report marked as checked.');
                        adminPaginationState.reviewed.loaded = false;
                        loadAdminReports('pending', 'init');
                    }).catch(error => {
                        console.error("Error updating report: ", error); alert("Error: " + error.message);
                    });
                }
            });
        });

        const deleteBtns = document.querySelectorAll('.admin-delete-confirm-btn');
        deleteBtns.forEach(btn => {
            if (btn.dataset.listenerAttached) return;
            btn.dataset.listenerAttached = true;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const reportId = btn.dataset.reportId;
                const postId = btn.dataset.postId;
                const commentId = btn.dataset.commentId;
                const isComment = (commentId && commentId !== 'undefined' && commentId !== '');

                if (confirm('DELETE this content? It will be backed up in "Deleted History".')) {
                    
                    let targetRef;
                    let collectionPath;
                    if(isComment) {
                        targetRef = db.collection("posts").doc(postId).collection("comments").doc(commentId);
                        collectionPath = `posts/${postId}/comments`;
                    } else {
                        targetRef = db.collection("posts").doc(postId);
                        collectionPath = `posts`;
                    }

                    targetRef.get().then(docSnap => {
                        if(!docSnap.exists) {
                            alert("Content already deleted or not found.");
                            return;
                        }
                        const data = docSnap.data();

                        db.collection("reports").doc(reportId).update({
                            status: "deleted",
                            backupData: data, 
                            collectionPath: collectionPath, 
                            docId: isComment ? commentId : postId,
                            actionTakenAt: firebase.firestore.FieldValue.serverTimestamp(),
                            actionNote: "Deleted by Admin via Dashboard"
                        }).then(() => {
                            return targetRef.delete();
                        }).then(() => {
                            if(isComment) {
                                db.collection("posts").doc(postId).update({ commentCount: firebase.firestore.FieldValue.increment(-1) });
                            }
                            alert('Content deleted and moved to history.');
                            adminPaginationState.deleted.loaded = false; 
                            loadAdminReports('pending', 'init');
                        }).catch(error => {
                            console.error("Error deleting: ", error);
                            alert("Error: " + error.message);
                        });
                    });
                }
            });
        });
    }

    function attachRestoreListeners() {
        const restoreBtns = document.querySelectorAll('.admin-restore-btn');
        restoreBtns.forEach(btn => {
            if (btn.dataset.listenerAttached) return;
            btn.dataset.listenerAttached = true;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const reportId = btn.dataset.reportId;

                if (confirm("Restore this content to Pending Reports?")) {
                    db.collection("reports").doc(reportId).get().then(snap => {
                        const report = snap.data();
                        if(!report.backupData) {
                            alert("Error: No backup data found for this report.");
                            return;
                        }

                        db.collection(report.collectionPath).doc(report.docId).set(report.backupData)
                        .then(() => {
                            return db.collection("reports").doc(reportId).update({
                                status: "pending", 
                                backupData: firebase.firestore.FieldValue.delete() 
                            });
                        }).then(() => {
                            if(report.collectionPath.includes("comments")) {
                                const pathParts = report.collectionPath.split('/'); 
                                const pId = pathParts[1];
                                if(pId) {
                                    db.collection("posts").doc(pId).update({ commentCount: firebase.firestore.FieldValue.increment(1) });
                                }
                            }
                            alert("Restored to Pending list!");
                            adminPaginationState.pending.loaded = false;
                            loadAdminReports('deleted', 'init');
                        }).catch(err => {
                            console.error("Restore failed:", err);
                            alert("Restore failed: " + err.message);
                        });
                    });
                }
            });
        });
    }

    function setupAdminPopupManager() {
        const database = (typeof db !== 'undefined') ? db : firebase.firestore();
        const popupCollection = database.collection('saved_popups'); 
        const storageRef = (typeof storage !== 'undefined') ? storage : firebase.storage();

        const menuAll = document.getElementById('menu-popup-all');
        const menuPost = document.getElementById('menu-popup-post');
        
        const viewAll = document.getElementById('view-popup-all');
        const viewPost = document.getElementById('view-popup-post');
        const createModal = document.getElementById('popup-create-modal');
        const btnAddNew = document.getElementById('btn-add-new-popup');
        const btnCancelPopup = document.getElementById('btn-cancel-popup');

        function switchView(targetView) {
            [viewAll, viewPost].forEach(el => {
                if(el) el.style.display = 'none';
            });
            if(targetView) targetView.style.display = 'block';

            if (targetView === viewAll) {
                renderSavedPopups();
            }
            if (targetView === viewPost) {
                renderPostPopups(); 
            }
        }

        if (menuAll) menuAll.addEventListener('click', () => switchView(viewAll));
        if (menuPost) menuPost.addEventListener('click', () => switchView(viewPost));

        // 새 팝업 추가 버튼
        if (btnAddNew) {
            btnAddNew.addEventListener('click', () => {
                if (createModal) createModal.style.display = 'flex';
                // 초기화
                const previewDiv = document.getElementById('popup-image-preview');
                const imgInput = document.getElementById('img-upload-input');
                const linkInput = document.getElementById('popup-link-url');
                const btnSave = document.getElementById('btn-save-popup');
                if (previewDiv) previewDiv.style.display = 'none';
                if (imgInput) imgInput.value = '';
                if (linkInput) linkInput.value = '';
                if (btnSave) {
                    btnSave.disabled = true;
                    btnSave.textContent = '💾 Save Popup';
                }
            });
        }

        // 모달 닫기
        if (btnCancelPopup) {
            btnCancelPopup.addEventListener('click', () => {
                if (createModal) createModal.style.display = 'none';
            });
        }

        // 모달 외부 클릭 시 닫기
        if (createModal) {
            createModal.addEventListener('click', (e) => {
                if (e.target === createModal) {
                    createModal.style.display = 'none';
                }
            });
        }

        switchView(viewAll);

        // 단순 이미지 업로드 방식으로 변경
        const imgInput = document.getElementById('img-upload-input');
        const btnSave = document.getElementById('btn-save-popup');
        const linkInput = document.getElementById('popup-link-url');
        const previewDiv = document.getElementById('popup-image-preview');
        const previewImg = document.getElementById('preview-img');
        const previewFilename = document.getElementById('preview-filename');
        
        let uploadedImageUrl = null;

        if (imgInput) {
            imgInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
                    
                    // 파일 크기 제한 (10MB)
                    if (file.size > 10 * 1024 * 1024) {
                        alert("Image file size must be less than 10MB.");
                        e.target.value = '';
                        return;
                    }

                    // 미리보기 표시
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        previewImg.src = event.target.result;
                        previewDiv.style.display = 'block';
                        previewFilename.textContent = `${file.name} (${fileSizeMB} MB)`;
                    };
                    reader.readAsDataURL(file);

                    // Firebase Storage에 업로드
                    const uploadPath = `popup_images/${Date.now()}_${file.name}`;
                    const uploadTask = storageRef.ref(uploadPath).put(file);

                    btnSave.disabled = true;
                    btnSave.textContent = "⏳ Uploading...";

                    uploadTask.then(snapshot => snapshot.ref.getDownloadURL())
                        .then(url => {
                            uploadedImageUrl = url;
                            btnSave.disabled = false;
                            btnSave.textContent = "💾 Save Popup";
                        })
                        .catch(err => {
                            console.error("Image upload failed:", err);
                            alert("Image upload failed. Please check your connection and try again.");
                            btnSave.disabled = true;
                            previewDiv.style.display = 'none';
                            e.target.value = '';
                        });
                }
            });
        }

        if (btnSave) {
            btnSave.addEventListener('click', () => {
                if (!uploadedImageUrl) {
                    alert("Please upload an image first.");
                    return;
                }

                const title = prompt("Enter a title for this popup:");
                if (!title || title.trim() === '') {
                    return;
                }

                const popupData = {
                    title: title.trim(),
                    imageUrl: uploadedImageUrl,
                    linkUrl: linkInput ? linkInput.value.trim() : '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                btnSave.textContent = "⏳ Saving...";
                btnSave.disabled = true;

                popupCollection.add(popupData)
                    .then(() => {
                        alert(`Popup "${title}" saved successfully!`);
                        btnSave.textContent = "💾 Save Popup";
                        btnSave.disabled = true;

                        // 초기화
                        uploadedImageUrl = null;
                        previewDiv.style.display = 'none';
                        if (imgInput) imgInput.value = '';
                        if (linkInput) linkInput.value = '';

                        popupPaginationState.saved.loaded = false;
                        popupPaginationState.saved.page = 1;
                        popupPaginationState.saved.allDocs = [];

                        popupPaginationState.post.loaded = false;
                        popupPaginationState.post.page = 1;
                        popupPaginationState.post.allDocs = [];

                        // 모달 닫기
                        const createModal = document.getElementById('popup-create-modal');
                        if (createModal) createModal.style.display = 'none';
                        
                        // 초기화
                        const previewDiv = document.getElementById('popup-image-preview');
                        const imgInput = document.getElementById('img-upload-input');
                        const linkInput = document.getElementById('popup-link-url');
                        if (previewDiv) previewDiv.style.display = 'none';
                        if (imgInput) imgInput.value = '';
                        if (linkInput) linkInput.value = '';
                        uploadedImageUrl = null;

                        switchView(viewAll);
                    })
                    .catch((error) => {
                        console.error("Error saving popup:", error);
                        alert("Error saving: " + error.message);
                        btnSave.textContent = "💾 Save Popup";
                        btnSave.disabled = false;
                    });
            });
        }


        function renderSavedPopups(action = 'current', targetPage = null) {
            const container = document.getElementById('saved-popups-container');
            if (!container) return;

            let state = popupPaginationState.saved; 
            const shouldFetch = (action === 'init' || !state.loaded);

            if (shouldFetch) {
                container.innerHTML = '<p style="text-align:center;">Loading saved popups...</p>';
            }

            const fetchPromise = shouldFetch
                ? popupCollection.orderBy("createdAt", "desc").get()
                : Promise.resolve(null);

            fetchPromise.then((querySnapshot) => {
                if (querySnapshot) {
                    state.allDocs = querySnapshot.docs;
                    state.totalDocs = querySnapshot.size;
                    state.totalPages = Math.ceil(state.totalDocs / POSTS_PER_PAGE);
                    if (state.totalPages === 0) state.totalPages = 1;
                    state.loaded = true;
                    state.page = 1;
                } else {
                    if (action === 'next' && state.page < state.totalPages) state.page++;
                    else if (action === 'prev' && state.page > 1) state.page--;
                    else if (action === 'jump' && targetPage) state.page = targetPage;
                    else if (action === 'last') state.page = state.totalPages;
                    else if (action === 'init') state.page = 1;
                }

                const startIndex = (state.page - 1) * POSTS_PER_PAGE;
                const endIndex = startIndex + POSTS_PER_PAGE;
                const currentDocs = state.allDocs.slice(startIndex, endIndex);

                container.innerHTML = '';
                if (state.totalDocs === 0) {
                    container.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">No popups saved yet. Go to "Make Your Popup" to create one.</p>';
                    return;
                }

                let html = `
                    <table class="admin-report-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Title</th>
                                <th>Link</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                currentDocs.forEach((doc) => {
                    const popup = doc.data();
                    const popupId = doc.id;
                    const date = popup.createdAt ? new Date(popup.createdAt.seconds * 1000).toLocaleString() : 'Just now';
                    const linkTxt = popup.linkUrl ? `<a href="${popup.linkUrl}" target="_blank">🔗 Link</a>` : '-';

                    html += `
                        <tr>
                            <td>${date}</td>
                            <td style="font-weight:600;">${popup.title}</td>
                            <td>${linkTxt}</td>
                            <td>
                                <span class="view-popup-btn" data-id="${popupId}" style="color:#007aff; cursor:pointer; margin-right:10px;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">View Image</span>
                                <button class="form-button delete-popup-btn" data-id="${popupId}" style="width:auto; padding:5px 10px; font-size:0.9em; background-color:#ff3b30;">Delete</button>
                            </td>
                        </tr>
                    `;
                });

                html += '</tbody></table>';
                container.innerHTML = html;

                renderPaginationControls(container, state, 'saved');

                attachPopupListListeners(popupCollection);
            })
            .catch((error) => {
                console.error("Error loading popups: ", error);
                container.innerHTML = '<p style="text-align: center; color: red;">Error loading popups.</p>';
            });
        }

        function renderPostPopups(action = 'current', targetPage = null) {
            const container = document.getElementById('view-popup-post');
            if (!container) return;
            
            const database = (typeof db !== 'undefined') ? db : firebase.firestore();
            const popupCollection = database.collection('saved_popups');
            const activePopupsRef = database.collection('settings').doc('active_popups'); 

            if (!container.querySelector('#post-list-area')) {
                container.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <div>
                            <h3 style="margin:0;">🚀 Post Your Popup</h3>
                            <p style="color:#888; margin:5px 0 0;">Toggle switches to add popups to the display queue.</p>
                        </div>
                    </div>
                    <div id="post-list-area">Loading...</div>
                `;
            }
            const listArea = container.querySelector('#post-list-area');
            let state = popupPaginationState.post;

            const fetchListPromise = (action === 'init' || !state.loaded)
                ? popupCollection.orderBy("createdAt", "desc").get()
                : Promise.resolve(null);
            
            const fetchActivePromise = activePopupsRef.get();

            Promise.all([fetchListPromise, fetchActivePromise]).then(([listSnapshot, activeSnapshot]) => {
                let activeList = [];
                if (activeSnapshot.exists && activeSnapshot.data().list) {
                    activeList = activeSnapshot.data().list;
                }

                if (listSnapshot) {
                    state.allDocs = listSnapshot.docs;
                    state.totalDocs = listSnapshot.size;
                    state.totalPages = Math.ceil(state.totalDocs / POSTS_PER_PAGE);
                    if (state.totalPages === 0) state.totalPages = 1;
                    state.loaded = true;
                    state.page = 1;
                } else {
                    if (action === 'next' && state.page < state.totalPages) state.page++;
                    else if (action === 'prev' && state.page > 1) state.page--;
                    else if (action === 'jump' && targetPage) state.page = targetPage;
                    else if (action === 'last') state.page = state.totalPages;
                    else if (action === 'init') state.page = 1;
                }

                const startIndex = (state.page - 1) * POSTS_PER_PAGE;
                const endIndex = startIndex + POSTS_PER_PAGE;
                const currentDocs = state.allDocs.slice(startIndex, endIndex);

                if (state.totalDocs === 0) {
                    listArea.innerHTML = '<p style="text-align:center; padding:20px; color:#888;">No saved popups available.</p>';
                    return;
                }

                let html = `
                    <table class="admin-report-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Title</th>
                                <th style="text-align:center;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                currentDocs.forEach((doc) => {
                    const popup = doc.data();
                    const date = popup.createdAt ? new Date(popup.createdAt.seconds * 1000).toLocaleDateString() : '-';
                    
                    const activeIndex = activeList.findIndex(p => p.sourceId === doc.id);
                    const isChecked = activeIndex !== -1;
                    
                    const statusText = isChecked 
                        ? `<span style="color:green; font-size:0.8em; font-weight:bold;">(Lived) (${activeIndex + 1})</span>` 
                        : '';

                    html += `
                        <tr>
                            <td>${date}</td>
                            <td style="font-weight:600;">${popup.title} ${statusText}</td>
                            <td style="text-align:center;">
                                <label class="switch">
                                    <input type="checkbox" class="activate-popup-toggle" data-id="${doc.id}" ${isChecked ? 'checked' : ''}>
                                    <span class="slider"></span>
                                </label>
                            </td>
                        </tr>
                    `;
                });
                html += '</tbody></table>';
                listArea.innerHTML = html;

                renderPaginationControls(listArea, state, 'post');

                const toggles = listArea.querySelectorAll('.activate-popup-toggle');
                toggles.forEach(toggle => {
                    toggle.addEventListener('change', (e) => {
                        const id = e.target.dataset.id;
                        const isTurningOn = e.target.checked;
                        const popupData = state.allDocs.find(d => d.id === id).data();

                        const queueItem = {
                            sourceId: id,
                            title: popupData.title,
                            imageUrl: popupData.imageUrl || null,
                            contentHtml: popupData.contentHtml || null, // 하위 호환성
                            linkUrl: popupData.linkUrl || ''
                        };

                        if (isTurningOn) {
                            database.runTransaction(transaction => {
                                return transaction.get(activePopupsRef).then(doc => {
                                    let list = [];
                                    if(doc.exists && doc.data().list) list = doc.data().list;
                                    
                                    if(!list.some(p => p.sourceId === id)) {
                                        list.push(queueItem);
                                    }
                                    transaction.set(activePopupsRef, { list: list }, { merge: true });
                                });
                            }).then(() => {
                                renderPostPopups('current'); 
                            }).catch(err => {
                                e.target.checked = false;
                                alert("Error adding to queue: " + err.message);
                            });

                        } else {
                            database.runTransaction(transaction => {
                                return transaction.get(activePopupsRef).then(doc => {
                                    if(!doc.exists) return;
                                    let list = doc.data().list || [];
                                    const newList = list.filter(p => p.sourceId !== id);
                                    transaction.update(activePopupsRef, { list: newList });
                                });
                            }).then(() => {
                                renderPostPopups('current'); 
                            }).catch(err => {
                                e.target.checked = true;
                                alert("Error removing from queue: " + err.message);
                            });
                        }
                    });
                });

            }).catch(err => {
                console.error("Render Error:", err);
                listArea.innerHTML = '<p style="color:red; text-align:center;">Error loading list.</p>';
            });
        }

        function renderPaginationControls(container, state, type) {
            const btnSize = "32px"; 
            const btnCommonStyle = `width: ${btnSize}; height: ${btnSize}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9em; border: 1px solid #ddd; background: #fff; cursor: pointer; color: #555; transition: all 0.2s; margin: 0 3px; padding: 0;`;
            const btnActiveStyle = `background-color: #007aff; color: white; border-color: #007aff; box-shadow: 0 2px 4px rgba(0,122,255,0.3); transform: scale(1.05);`;
            const btnDisabledStyle = `background-color: #f9f9f9; color: #ccc; cursor: default; border-color: #eee;`;
            
            const hasPrev = state.page > 1; 
            const hasNext = state.page < state.totalPages;
            const currentGroup = Math.ceil(state.page / PAGE_GROUP_SIZE);
            const startPageNum = (currentGroup - 1) * PAGE_GROUP_SIZE + 1;
            let endPageNum = startPageNum + PAGE_GROUP_SIZE - 1;
            if (endPageNum > state.totalPages) endPageNum = state.totalPages;

            let pageNumbersHtml = '';
            for (let i = startPageNum; i <= endPageNum; i++) {
                const isActive = (i === state.page);
                pageNumbersHtml += `<button class="popup-page-btn" data-type="${type}" data-page="${i}" style="${isActive ? btnCommonStyle + ' ' + btnActiveStyle : btnCommonStyle}">${i}</button>`;
            }

            const oldControls = container.querySelector('.pagination-controls');
            if(oldControls) oldControls.remove();

            container.insertAdjacentHTML('beforeend', `
                <div class="pagination-controls" style="display: flex; justify-content: center; gap: 2px; margin-top: 20px; align-items: center;">
                    <button class="form-button popup-nav-btn" data-type="${type}" data-action="init" ${!hasPrev ? 'disabled' : ''} style="${hasPrev ? btnCommonStyle : btnCommonStyle + ' ' + btnDisabledStyle}">&lt;&lt;</button>
                    <button class="form-button popup-nav-btn" data-type="${type}" data-action="prev" ${!hasPrev ? 'disabled' : ''} style="${hasPrev ? btnCommonStyle : btnCommonStyle + ' ' + btnDisabledStyle}">&lt;</button>
                    <div style="display:flex; gap: 0; margin: 0 5px;">${pageNumbersHtml}</div>
                    <button class="form-button popup-nav-btn" data-type="${type}" data-action="next" ${!hasNext ? 'disabled' : ''} style="${hasNext ? btnCommonStyle : btnCommonStyle + ' ' + btnDisabledStyle}">&gt;</button>
                    <button class="form-button popup-nav-btn" data-type="${type}" data-action="last" ${!hasNext ? 'disabled' : ''} style="${hasNext ? btnCommonStyle : btnCommonStyle + ' ' + btnDisabledStyle}">&gt;&gt;</button>
                </div>`);

            container.querySelectorAll(`.popup-nav-btn[data-type="${type}"]`).forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    if(type === 'saved') renderSavedPopups(action);
                    if(type === 'post') renderPostPopups(action);
                });
            });
            container.querySelectorAll(`.popup-page-btn[data-type="${type}"]`).forEach(btn => {
                btn.addEventListener('click', () => {
                    const target = parseInt(btn.dataset.page);
                    if(type === 'saved') renderSavedPopups('jump', target);
                    if(type === 'post') renderPostPopups('jump', target);
                });
            });
        }

        function attachPopupListListeners(collection) {
            // View Image Preview
            document.querySelectorAll('.view-popup-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    collection.doc(id).get().then((doc) => {
                        if (doc.exists) {
                            const data = doc.data();
                            if (data.imageUrl) {
                                // 이미지 팝업으로 표시
                                const previewWindow = window.open('', '_blank', 'width=600,height=700');
                                previewWindow.document.write(`
                                    <html>
                                        <head><title>${data.title || 'Popup Preview'}</title></head>
                                        <body style="margin:0; padding:20px; background:#f5f5f7; display:flex; justify-content:center; align-items:center; min-height:100vh;">
                                            <div style="background:white; border-radius:12px; padding:20px; max-width:500px; box-shadow:0 4px 20px rgba(0,0,0,0.1);">
                                                <h2 style="margin:0 0 15px 0; color:#333;">${data.title || 'Untitled'}</h2>
                                                <img src="${data.imageUrl}" alt="Preview" style="width:100%; height:auto; border-radius:8px; border:1px solid #ddd;">
                                                ${data.linkUrl ? `<p style="margin-top:15px; color:#666; font-size:0.9em;">🔗 Link: <a href="${data.linkUrl}" target="_blank">${data.linkUrl}</a></p>` : ''}
                                            </div>
                                        </body>
                                    </html>
                                `);
                            } else {
                                alert(`Popup "${data.title}" has no image.`);
                            }
                        }
                    });
                });
            });

            // Delete
            document.querySelectorAll('.delete-popup-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const activePopupsRef = (typeof db !== 'undefined' ? db : firebase.firestore()).collection('settings').doc('active_popups');

                    // 1. 활성 큐에 있는지 확인
                    activePopupsRef.get().then(doc => {
                        let list = [];
                        if (doc.exists) list = doc.data().list || [];
                        
                        const isPosted = list.some(p => p.sourceId === id);

                        if (isPosted) {
                            alert("Cannot delete a popup that is currently queued/active. Please uncheck it in the 'Post Your Popup' tab first.");
                            return;
                        }

                        // 3. 삭제 진행
                        if(confirm("Permanently delete this saved popup?")) {
                            collection.doc(id).delete().then(() => {
                                // 목록 새로고침
                                renderSavedPopups('init');
                                // Post 탭 캐시 초기화
                                popupPaginationState.post.loaded = false;
                                popupPaginationState.post.page = 1;
                                popupPaginationState.post.allDocs = [];
                            }).catch((error) => {
                                alert("Error deleting: " + error.message);
                            });
                        }
                    }).catch(err => {
                        console.error("Error checking active popup:", err);
                        alert("Error checking status: " + err.message);
                    });
                });
            });
        }

        // Helper
        function selectItem(element) {
            if (selectedElement) selectedElement.classList.remove('selected');
            selectedElement = element;
            selectedElement.classList.add('selected');
            if (element.classList.contains('text-item') && element.style.fontSize) {
                fontSize.value = parseInt(element.style.fontSize);
            }
        }

        function hidePlaceholder() {
            const ph = canvas.querySelector('.canvas-placeholder');
            if (ph) ph.style.display = 'none';
        }
    }

    // --- [Client Popup Functions - Queue & Scaling] ---
    let popupQueue = [];

    function checkAndShowPopup() {
        const popupOverlay = document.getElementById('site-popup');
        const database = (typeof db !== 'undefined') ? db : firebase.firestore();

        // 활성 팝업 리스트 가져오기
        database.collection('settings').doc('active_popups').get().then(doc => {
            if (doc.exists && doc.data().list && doc.data().list.length > 0) {
                const allPopups = doc.data().list;
                const todayDate = new Date().toISOString().split('T')[0];

                // 쿠키가 없는 팝업만 필터링해서 대기열에 추가
                popupQueue = allPopups.filter(p => !getCookie(`hidePopup_${p.sourceId}_${todayDate}`));

                if (popupQueue.length > 0) {
                    showNextPopup(); // 첫 번째 팝업 표시
                }
            }
        }).catch(err => console.error("Popup Load Error:", err));
    }

    function showNextPopup() {
        const popupOverlay = document.getElementById('site-popup');
        
        // 대기열이 비었으면 오버레이 닫고 종료
        if (popupQueue.length === 0) {
            popupOverlay.style.display = 'none';
            return;
        }

        const currentPopup = popupQueue.shift(); 
        
        // 1. 먼저 보이게 설정 (display: flex)
        popupOverlay.style.display = 'flex';
        
        // 2. 브라우저 렌더링 타이밍 확보 후 컨텐츠 그리기
        requestAnimationFrame(() => {
             renderPopupContent(currentPopup);
        });
    }

    function renderPopupContent(data) {
        const popupContent = document.querySelector('.popup-content');
        const popupInner = document.getElementById('popup-inner-wrapper');
        const closeBtn = document.getElementById('btn-close-popup');
        const todayBtn = document.getElementById('btn-dont-show-today');

        // 기존 버튼 이벤트 제거 (복제를 통해)
        const newCloseBtn = closeBtn.cloneNode(true);
        const newTodayBtn = todayBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        todayBtn.parentNode.replaceChild(newTodayBtn, todayBtn);

        // 이미지 팝업 표시 (비율 유지)
        if (data.imageUrl) {
            // 이미지를 중앙 정렬하고 비율을 유지하는 컨테이너 생성
            let imageHTML = `<div id="popup-image-container" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                <img id="popup-display-img" src="${data.imageUrl}" alt="Popup" style="max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain; display:block;">
            </div>`;
            
            if (data.linkUrl) {
                popupInner.innerHTML = `<a href="${data.linkUrl}" target="_blank" style="display:block; width:100%; height:100%; position:relative; text-decoration:none; cursor:pointer;">${imageHTML}</a>`;
            } else {
                popupInner.innerHTML = imageHTML;
            }

            // 이미지 비율 유지 및 중앙 정렬 (개선된 버전)
            const adjustImageSize = () => {
                const img = document.getElementById('popup-display-img');
                const container = document.getElementById('popup-image-container');
                if (!img || !container) return;
                
                const availableWidth = popupContent.clientWidth;
                const availableHeight = popupContent.clientHeight - 60; // footer space
                
                // 이미지가 로드되면 비율 계산
                const updateSize = () => {
                    if (img.naturalWidth === 0 || img.naturalHeight === 0) return;
                    
                    const imgAspect = img.naturalWidth / img.naturalHeight;
                    const containerAspect = availableWidth / availableHeight;
                    
                    // 이미지 비율을 유지하면서 컨테이너에 맞춤
                    if (imgAspect > containerAspect) {
                        // 이미지가 더 넓음 - 너비에 맞춤
                        img.style.width = '100%';
                        img.style.height = 'auto';
                    } else {
                        // 이미지가 더 높음 - 높이에 맞춤
                        img.style.width = 'auto';
                        img.style.height = '100%';
                    }
                };
                
                // 이미지 로드 이벤트
                img.onload = updateSize;
                
                // 이미지가 이미 로드된 경우
                if (img.complete && img.naturalWidth > 0) {
                    updateSize();
                }
            };

            // 초기 조정 및 리사이즈 이벤트
            setTimeout(adjustImageSize, 100); // DOM 렌더링 대기
            window.addEventListener('resize', adjustImageSize);
            
            // 팝업이 닫힐 때 리사이즈 리스너 제거
            const removeResizeListener = () => {
                window.removeEventListener('resize', adjustImageSize);
            };
            newCloseBtn.addEventListener('click', removeResizeListener);
            newTodayBtn.addEventListener('click', removeResizeListener);
        } else if (data.contentHtml) {
            // 기존 contentHtml 방식 (하위 호환성)
            let contentHTML = `<div id="scale-target" style="position:absolute; width:500px; height:500px; left:50%; top:50%; transform:translate(-50%, -50%); transform-origin: center center; overflow:hidden; background:white;">${data.contentHtml}</div>`;
            
            if (data.linkUrl) {
                popupInner.innerHTML = `<a href="${data.linkUrl}" target="_blank" style="display:block; width:100%; height:100%; position:relative; text-decoration:none; color:inherit; cursor:pointer;">${contentHTML}</a>`;
            } else {
                popupInner.innerHTML = contentHTML;
            }

            // 편집 속성 제거
            const editorItems = popupInner.querySelectorAll('.editor-item');
            editorItems.forEach(item => {
                item.removeAttribute('contenteditable');
                item.style.resize = 'none';
                item.style.border = 'none';
                item.classList.remove('selected');
                
                // 링크가 있으면 포인터 커서 유지
                if (data.linkUrl) {
                    item.style.cursor = 'pointer'; 
                } else {
                    item.style.cursor = 'default';
                }
            });

            // 스케일링 함수
            const scaleContent = () => {
                const target = document.getElementById('scale-target');
                if (!target) return;
                const availableWidth = popupContent.clientWidth;
                const availableHeight = popupContent.clientHeight - 60; // footer space
                
                // 0으로 나뉘거나 계산 오류 방지
                if (availableWidth <= 0 || availableHeight <= 0) {
                    // 아직 렌더링 안됐으면 잠시 후 재시도
                    setTimeout(scaleContent, 50); 
                    return;
                }

                const scale = Math.min(availableWidth, availableHeight) / 500;
                target.style.transform = `translate(-50%, -50%) scale(${scale})`;
            };
            
            // 즉시 실행 및 리사이즈 이벤트 등록
            scaleContent();
            window.addEventListener('resize', scaleContent);
        }

        // 버튼 이벤트 연결 (다음 팝업으로 넘어가는 로직)
        newCloseBtn.addEventListener('click', () => {
            showNextPopup(); 
        });

        newTodayBtn.addEventListener('click', () => {
            const todayDate = new Date().toISOString().split('T')[0];
            const cookieName = `hidePopup_${data.sourceId}_${todayDate}`;
            
            // 1일(24시간) = 1
            const oneDay = 1; 
            setCookie(cookieName, 'true', oneDay); 
            
            showNextPopup();
        });
    }

    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            let date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }
    
    function getCookie(name) {
        let nameEQ = name + "="; let ca = document.cookie.split(';');
        for(let i=0;i < ca.length;i++) { let c = ca[i]; while (c.charAt(0)==' ') c = c.substring(1,c.length); if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length); }
        return null;
    }

    // --- 6. Global Listeners ---
    document.addEventListener('click', (e) => {
        if (!e.target.matches('.menu-toggle-btn')) {
            document.querySelectorAll('.menu-dropdown.show').forEach(dropdown => { dropdown.classList.remove('show'); });
        }
    });

}); // End of DOMContentLoaded
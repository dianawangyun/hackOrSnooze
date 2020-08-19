$(async function() {
    // cache some selectors we'll be using quite a bit
    const $allStoriesList = $("#all-articles-list");
    const $submitForm = $("#submit-form");
    const $filteredArticles = $("#filtered-articles");
    const $favoritedArticles = $("#favorited-articles");
    const $loginForm = $("#login-form");
    const $createAccountForm = $("#create-account-form");
    const $ownStories = $("#my-articles");
    const $editArticleForm = $("#edit-article-form");
    const $navLogin = $("#nav-login");
    const $navLogOut = $("#nav-logout");
    const $navUserProfile = $("#nav-user-profile");
    const $userProfile = $("#user-profile");
    const $editUserForm = $("#edit-user-form");

    // global storyList variable
    let storyList = null;

    // global currentUser variable
    let currentUser = null;

    await loadPage();

    /* --------------------Load Page----------------------- */

    /**
     * On page load, checks local storage to see if the user is already logged in.
     * Renders page information accordingly.
     */

    async function loadPage() {
        // let's see if we're logged in
        const token = localStorage.getItem("token");
        const username = localStorage.getItem("username");

        // if there is a token in localStorage, call User.getLoggedInUser
        //  to get an instance of User with the right details
        //  this is designed to run once, on page load
        currentUser = await User.getLoggedInUser(token, username);
        await generateStories();

        if (currentUser) {
            showNavForLoggedInUser();
            await generateFavStories();
            await generateMyStory();
        }
    }


    /**
     * A rendering function to run to reset the forms and hide the login info
     */

    function loginAndSubmitForm() {
        // hide the forms for logging in and signing up
        $loginForm.hide();
        $createAccountForm.hide();

        // reset those forms
        $loginForm.trigger("reset");
        $createAccountForm.trigger("reset");

        // update the page
        loadPage();

        // show the stories section
        $allStoriesList.show();

    }

    /**
     * A rendering function to call the StoryList.getStories static method,
     *  which will generate a storyListInstance. Then render it.
     */

    async function generateStories() {
        // get an instance of StoryList
        const storyListInstance = await StoryList.getStories();
        // update our global variable
        storyList = storyListInstance;
        // empty out that part of the page
        $allStoriesList.empty();

        // loop through all of our stories and generate HTML for them
        for (let story of storyList.stories) {
            const result = generateStoryHTML(story);
            $allStoriesList.append(result);
        }

    }

    /**
     * A function to render HTML for an individual Story instance
     */

    function generateStoryHTML(story) {
        let hostName = getHostName(story.url);

        // render story markup
        const storyMarkup = $(`
      <li id="${story.storyId}">
        <span class="star"><i class=" ${setStarType(story)}"></i></span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <span class="trash-can"><i class="${setTrashCan(story)}"></i></span> 
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

        return storyMarkup;
    }

    // return whether the story is in user's favorites
    function setStarType(story) {
        if (!currentUser) {
            return "none";
        }
        let favStoryIds = currentUser.favorites.map((fav) => fav.storyId);
        return favStoryIds.indexOf(story.storyId) > -1 ? "fas fa-star" : "far fa-star";
    }

    // return whether the story is user's
    function setOwn(story) {
        if (!currentUser) {
            return false;
        }
        let ownStoryIds = currentUser.ownStories.map((own) => own.storyId);
        return ownStoryIds.indexOf(story.storyId) > -1 ? true : false;
    }

    function setTrashCan(story) {
        if (setOwn(story) === true) {
            return "fas fa-trash-alt"
        } else {
            return "none";
        }
    }
    /* hide all elements in elementsArr */

    function hideElements() {
        const elementsArr = [
            $submitForm,
            $allStoriesList,
            $filteredArticles,
            $favoritedArticles,
            $ownStories,
            $editArticleForm,
            $loginForm,
            $createAccountForm,
            $userProfile,
            $editUserForm

        ];
        elementsArr.forEach($elem => $elem.hide());
    }

    // show more options in the nav for logged in user
    function showNavForLoggedInUser() {
        $navLogin.hide();
        $("#nav-main-links").show();
        $("#nav-welcome").show();
        $navUserProfile.html(currentUser.name);
        $navLogOut.show();
    }

    /* ----------------Login/Logout/Signup------------------  */

    /**
     * Event listener for logging in.
     *  If successfully we will setup the user instance
     */

    $loginForm.on("submit", async function(evt) {
        evt.preventDefault(); // no page-refresh on submit
        $("#btn-login").attr("disabled", true);
        // grab the username and password
        const username = $("#login-username").val();
        const password = $("#login-password").val();

        // call the login static method to build a user instance
        try {
            const userInstance = await User.login(username, password);

            // set the global user to the user instance
            currentUser = userInstance;
            syncCurrentUserToLocalStorage();
            loginAndSubmitForm();
        } catch (e) {
            if (e &&
                e.response &&
                e.response.data &&
                e.response.data.error &&
                e.response.data.error.message)
                alert(e.response.data.error.message);
        }
        $("#btn-login").attr("disabled", false);
    });

    /**
     * Event listener for signing up.
     *  If successfully we will setup a new user instance
     */

    $createAccountForm.on("submit", async function(evt) {
        evt.preventDefault(); // no page refresh

        // grab the required fields
        let name = $("#create-account-name").val();
        let username = $("#create-account-username").val();
        let password = $("#create-account-password").val();

        // call the create method, which calls the API and then builds a new user instance
        try {
            const newUser = await User.create(username, password, name);
            currentUser = newUser;
            syncCurrentUserToLocalStorage();
            loginAndSubmitForm();
        } catch (e) {
            if (e &&
                e.response &&
                e.response.data &&
                e.response.data.error &&
                e.response.data.error.message
            ) {
                alert(e.response.data.error.message);
            }
        }
    });

    /**
     * Log Out Functionality
     */

    $navLogOut.on("click", function() {
        // empty out local storage
        localStorage.clear();
        // refresh the page, clearing memory
        location.reload();
    });


    /* -------------------Nav Control-------------------- */

    $navLogin.on("click", function() {
        // Show the Login and Create Account Forms
        $loginForm.slideToggle();
        $createAccountForm.slideToggle();
        $allStoriesList.toggle();
    });

    $("body").on("click", "#nav-all", async function() {
        hideElements();
        await loadPage();
        $allStoriesList.show();
    });

    $("#nav-submit").on("click", function() {
        hideElements();
        $submitForm.show();
    })

    $("#nav-favorites").on("click", function() {
        hideElements();
        $favoritedArticles.show();
    })

    $("#nav-user-stories").on("click", function() {
        hideElements();
        $ownStories.show();
    })


    /* --------------------Submit Story------------------ */

    // let user to submit a story
    $submitForm.on("submit", async function(evt) {
        evt.preventDefault();

        //grab the sumit information
        let author = $("#author").val();
        let title = $("#title").val();
        let url = $("#url").val();
        let newStory = { author, title, url };
        await storyList.addStory(currentUser, newStory);
        await submitAndShowStoriesList();
    })

    async function submitAndShowStoriesList() {
        $submitForm.hide();
        $submitForm.trigger("reset");
        await loadPage();
        $allStoriesList.show();
    }


    /* -------------------Favorite Story-------------------- */

    // let user to mark/unmark favorite stories
    $allStoriesList.add($favoritedArticles).add($("#my-articles")).on("click", ".star", async function() {
        const storyId = $(this).parent().attr("id");
        const isFav = $(this).find("i").hasClass("fas");
        try {
            await currentUser.toggleFav(storyId, isFav);
            await loadPage();
        } catch (e) {
            console.log(e);
        }
    })

    // generate a list for favorite stories
    async function generateFavStories() {
        $favoritedArticles.empty();
        // loop through favorites of user and generate HTML for them
        if (currentUser.favorites.length === 0) {
            $favoritedArticles.text("No favorites added!");
            return;
        }
        currentUser.favorites = currentUser.favorites.reverse();
        for (let story of currentUser.favorites) {
            const result = generateStoryHTML(story);
            $favoritedArticles.append(result);
        }
    }


    /* -------------------User Story-------------------- */
    async function generateMyStory() {
        $ownStories.empty();
        if (currentUser.ownStories.length === 0) {
            $ownStories.text("No stories added by user yet!");
            return;
        }
        currentUser.ownStories = currentUser.ownStories.reverse();
        for (let story of currentUser.ownStories) {
            const result = generateStoryHTML(story);
            const $pencilIcon = $(`<span class="pencil"><i class="${setPencil(story)}"></i></span>`);
            $pencilIcon.insertAfter(result.find("span.trash-can"));
            $ownStories.append(result);
        }
    }

    // add pencil icon to own stories
    function setPencil(story) {
        if (setOwn(story) === true) {
            return "fas fa-pencil-alt";
        } else {
            return "none";
        }
    }

    // click trash-can icon to delete own story
    $allStoriesList.add($favoritedArticles).add($ownStories).on("click", ".trash-can", async function() {
        const storyId = $(this).parent().attr("id");
        try {
            await currentUser.deleteStory(storyId);
            await loadPage();
        } catch (e) {
            console.log(e);
        }
    })

    // click pencil icon to modify own story
    $ownStories.on("click", ".pencil", function() {
        const storyId = $(this).parent().attr("id");
        let selectedStory = {};

        currentUser.ownStories.forEach((story) => {
            if (storyId === story.storyId) {
                selectedStory = story;
            }
        });

        loadEditArticleForm(selectedStory);
        $editArticleForm.fadeIn();
    })

    function loadEditArticleForm(story) {
        $editArticleForm.trigger("reset");
        $editArticleForm.data("storyId", story.storyId);
        $("#edit-author").attr("placeholder", story.author);
        $("#edit-title").attr("placeholder", story.title);
        $("#edit-url").attr("placeholder", story.url);
    }

    $editArticleForm.on("submit", async function(e) {
        e.preventDefault();
        $("#btn-submit-story").attr("disabled", true);
        const storyId = $(this).data("storyId");
        const author = $("#edit-author").val();
        const title = $("#edit-title").val();
        const url = $("#edit-url").val();
        const storyUpdate = { author, title, url }
        try {
            await currentUser.updateStory(storyId, storyUpdate);
            await loadPage();
            $editArticleForm.fadeOut();
        } catch (e) {
            console.log(e);
        }
        $("#btn-submit-story").attr("disabled", false);
    });


    $("#btnCancelUpdateStory").on("click", function() {
        $editArticleForm.fadeOut();
    })

    /* -------------------User Profile-------------------- */

    // show user profile info page
    $navUserProfile.on("click", function() {
        hideElements();
        displayUserProfileHTML();
        $userProfile.show();
    })

    function displayUserProfileHTML() {
        $("#profile-name").text(`Name: ${currentUser.name}`);
        $("#profile-username").text(`Username: ${currentUser.username}`);
        $("#profile-account-date").text(`Account Created: ${currentUser.createdAt}`);
    }

    $("#btn-update-profile").on("click", function() {
        $editUserForm.trigger("reset");
        $editUserForm.fadeIn();
    })

    $editUserForm.on("submit", async function(e) {
        e.preventDefault();
        $("#btn-submit-profile").attr("disabled", true);
        const name = $("#edit-name").val();
        const password = $("#edit-password").val();
        const userUpdate = { name, password };
        try {
            await currentUser.updateProfile(userUpdate);
            await loadPage();
            displayUserProfileHTML()
            $editUserForm.fadeOut();
        } catch (e) {
            console.log(e);
        }
        $("#btn-submit-profile").attr("disabled", false);
    })


    $("#btn-cancel-update-profile").on("click", function() {
            $editUserForm.fadeOut();
        })
        /* -------------------Tool Functions------------------- */

    /* simple function to pull the hostname from a URL */
    function getHostName(url) {
        let hostName;
        if (url.indexOf("://") > -1) {
            hostName = url.split("/")[2];
        } else {
            hostName = url.split("/")[0];
        }
        if (hostName.slice(0, 4) === "www.") {
            hostName = hostName.slice(4);
        }
        return hostName;
    }

    /* sync current user information to localStorage */
    function syncCurrentUserToLocalStorage() {
        if (currentUser) {
            localStorage.setItem("token", currentUser.loginToken);
            localStorage.setItem("username", currentUser.username);
        }
    }

})
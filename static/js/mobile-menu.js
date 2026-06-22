const menuBtn = document.getElementById("mobileMenuBtn");
const mobilePanel = document.getElementById("mobilePanel");

if(menuBtn && mobilePanel){

    menuBtn.addEventListener("click",()=>{

        menuBtn.classList.toggle("active");
        mobilePanel.classList.toggle("show");

    });

    document.addEventListener("click",(e)=>{

        if(
            !mobilePanel.contains(e.target) &&
            !menuBtn.contains(e.target)
        ){
            menuBtn.classList.remove("active");
            mobilePanel.classList.remove("show");
        }

    });

}

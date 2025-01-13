import React from 'react'
import Hearder from '../components/Hearder'
import SpecialityMenu from '../components/SpecialityMenu'
import TopDoctors from '../components/TopDoctors'
import Banner from '../components/Banner'

const Home = () => {
  return (
    <div>
       <Hearder/>
       <SpecialityMenu/> 
       <TopDoctors/>
       <Banner/>
    </div>
  )
}

export default Home
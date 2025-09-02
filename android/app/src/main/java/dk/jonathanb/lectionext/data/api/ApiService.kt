package dk.jonathanb.lectionext.data.api

import dk.jonathanb.lectionext.data.model.Lesson
import retrofit2.http.GET
import retrofit2.http.Query

interface ApiService {
    @GET("api")
    suspend fun getLessons(@Query("gymId") gymId: Int): List<Lesson>
}
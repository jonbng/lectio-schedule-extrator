package dk.jonathanb.lectionext.data.api

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object ApiClient {
    val api: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl("https://lectio.jonathanb.dk/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
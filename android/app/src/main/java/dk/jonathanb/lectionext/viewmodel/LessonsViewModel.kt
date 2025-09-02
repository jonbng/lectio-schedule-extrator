package dk.jonathanb.lectionext.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dk.jonathanb.lectionext.data.api.ApiClient
import dk.jonathanb.lectionext.data.model.Lesson
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class LessonsViewModel : ViewModel() {
    private val _lessons = MutableStateFlow<List<Lesson>>(emptyList())
    val lessons: StateFlow<List<Lesson>> = _lessons

    fun loadLessons(gymId: Int) {
        viewModelScope.launch {
            try {
                val response = ApiClient.api.getLessons(gymId)
                _lessons.value = response
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

}
package dk.jonathanb.lectionext.ui.screens

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import dk.jonathanb.lectionext.viewmodel.LessonsViewModel

@Composable
fun LessonsScreen(viewModel: LessonsViewModel) {
     //val lessons by viewModel.lessons.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadLessons(94)
    }

    //lessons.forEach
}
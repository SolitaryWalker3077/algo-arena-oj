package com.oj.system.service.exam;


import com.oj.system.entity.exam.dto.ExamAddDto;
import com.oj.system.entity.exam.dto.ExamQueryDto;
import com.oj.system.entity.exam.dto.ExamQuestionAddDto;
import com.oj.system.entity.exam.vo.ExamDetailVO;
import com.oj.system.entity.exam.vo.ExamVO;

import java.util.List;

public interface IExamService {

    List<ExamVO> list(ExamQueryDto examQueryDto);

    int add(ExamAddDto examAddDto);

    boolean questionAdd(ExamQuestionAddDto examQuestionAddDto);

    ExamDetailVO detail(Long examId);
}
